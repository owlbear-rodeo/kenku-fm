use anyhow::Result;
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use bytes::Bytes;
use rtp::packetizer::Depacketizer;
use std::{
    io::{BufWriter, Read, Write},
    sync::{Arc, Mutex},
};
use tokio::sync::Notify;
use webrtc::{
    media::io::{
        ogg_reader::{
            PAGE_HEADER_SIGNATURE, PAGE_HEADER_SIZE, PAGE_HEADER_TYPE_CONTINUATION_OF_STREAM,
            PAGE_HEADER_TYPE_END_OF_STREAM,
        },
        Writer,
    },
    track::track_remote::TrackRemote,
};

pub struct OpusReader {
    writer: Arc<Mutex<OpusWriter>>,
    last_payload_size: usize,
}

impl OpusReader {
    pub fn new(writer: Arc<Mutex<OpusWriter>>) -> Self {
        OpusReader {
            writer,
            last_payload_size: 0,
        }
    }
}

impl Read for OpusReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let writer = self.writer.lock().unwrap();
        let mut data = writer.data.lock().unwrap();
        let buf_len = buf.len();
        // The songbird input will first read an i16 to determine the payload size
        // Detect this and read the next header
        if buf_len == 2 {
            if data.len() < PAGE_HEADER_SIZE {
                // If we don't have enough data send an empty buffer
                buf.as_mut()
                    .write_i16::<LittleEndian>(self.last_payload_size as i16)?;
                return Ok(buf_len);
            }
            let mut header = &data[..PAGE_HEADER_SIZE + 1];
            let mut sig = [0u8; 4]; //0-3
            header.read_exact(&mut sig)?;
            let _version = header.read_u8()?; //4
            let _header_type = header.read_u8()?; //5
            let _granule_position = header.read_u64::<LittleEndian>()?; //6-13
            let _serial = header.read_u32::<LittleEndian>()?; //14-17
            let _index = header.read_u32::<LittleEndian>()?; //18-21
            let _checksum = header.read_u32::<LittleEndian>()?; //22-25
            let _segments_count = header.read_u8()?; //26
            let payload_size = header.read_u8()?;

            buf.as_mut()
                .write_i16::<LittleEndian>(payload_size as i16)?;

            // Consume header
            data.drain(..PAGE_HEADER_SIZE + 1);

            Ok(buf_len)
        } else {
            let payload_size = buf_len;
            if data.len() < payload_size {
                return Ok(payload_size);
            }
            self.last_payload_size = payload_size;
            let payload = &data[..payload_size];

            buf.as_mut().write_all(payload)?;

            // Consume payload
            data.drain(..payload_size);

            Ok(payload_size)
        }
    }
}

pub struct OpusWriter {
    pub data: Mutex<Vec<u8>>,
    pub sample_rate: u32,
    pub channel_count: u8,
    serial: u32,
    page_index: u32,
    previous_granule_position: u64,
    previous_timestamp: u32,
    last_payload_size: usize,
    last_payload: Bytes,
}

// Adapted from webrtc-media
impl OpusWriter {
    pub fn new() -> Result<Self> {
        let data = Mutex::new(Vec::new());
        Ok(OpusWriter {
            data,
            sample_rate: 48000,
            channel_count: 2,
            serial: rand::random::<u32>(),
            page_index: 0,
            previous_timestamp: 1,
            previous_granule_position: 1,
            last_payload_size: 0,
            last_payload: Bytes::new(),
        })
    }

    fn write_page(
        &mut self,
        payload: &Bytes,
        header_type: u8,
        granule_pos: u64,
        page_index: u32,
    ) -> Result<(), webrtc::media::Error> {
        self.last_payload_size = payload.len();
        self.last_payload = payload.clone();

        let mut page = Vec::with_capacity(PAGE_HEADER_SIZE + 1 + self.last_payload_size);
        {
            let mut header_writer = BufWriter::new(&mut page);
            header_writer.write_all(PAGE_HEADER_SIGNATURE)?; // page headers starts with 'OggS'//0-3
            header_writer.write_u8(0)?; // Version//4
            header_writer.write_u8(header_type)?; // 1 = continuation, 2 = beginning of stream, 4 = end of stream//5
            header_writer.write_u64::<LittleEndian>(granule_pos)?; // granule position //6-13
            header_writer.write_u32::<LittleEndian>(self.serial)?; // Bitstream serial number//14-17
            header_writer.write_u32::<LittleEndian>(page_index)?; // Page sequence number//18-21
            header_writer.write_u32::<LittleEndian>(0)?; //Checksum reserve //22-25
            header_writer.write_u8(1)?; // Number of segments in page, giving always 1 segment //26
            header_writer.write_u8(self.last_payload_size as u8)?; // Segment Table inserting at 27th position since page header length is 27
            header_writer.write_all(payload)?; // inserting at 28th since Segment Table(1) + header length(27)
        }

        let mut data_lock = self.data.lock().unwrap();
        data_lock.write_all(&page)?;

        Ok(())
    }
}

impl Writer for OpusWriter {
    fn write_rtp(
        &mut self,
        packet: &webrtc::rtp::packet::Packet,
    ) -> Result<(), webrtc::media::Error> {
        let mut opus_packet = rtp::codecs::opus::OpusPacket::default();
        let payload = opus_packet.depacketize(&packet.payload)?;

        // Should be equivalent to sample_rate * duration
        if self.previous_timestamp != 1 {
            let increment = packet.header.timestamp - self.previous_timestamp;
            self.previous_granule_position += increment as u64;
        }
        self.previous_timestamp = packet.header.timestamp;

        self.write_page(
            &payload,
            PAGE_HEADER_TYPE_CONTINUATION_OF_STREAM,
            self.previous_granule_position,
            self.page_index,
        )?;
        self.page_index += 1;

        Ok(())
    }

    fn close(&mut self) -> Result<(), webrtc::media::Error> {
        let payload = self.last_payload.clone();
        self.write_page(
            &payload,
            PAGE_HEADER_TYPE_END_OF_STREAM,
            self.previous_granule_position,
            self.page_index - 1,
        )?;

        let mut data_lock = self.data.lock().unwrap();
        if let Err(_) = data_lock.flush() {
            return Err(webrtc::media::Error::ErrIoEOF);
        }
        Ok(())
    }
}

pub async fn write_to_stream(
    writer: Arc<Mutex<OpusWriter>>,
    track: Arc<TrackRemote>,
    notify: Arc<Notify>,
) -> Result<()> {
    loop {
        tokio::select! {
            result = track.read_rtp() => {
                if let Ok((rtp_packet, _)) = result {
                    let mut w = writer.lock().unwrap();
                    let res = w.write_rtp(&rtp_packet);
                    if let Err(e) = res {
                        println!("rtp write error: {}", e);
                    }
                } else {
                    println!("stream closing begin after read_rtp error");
                    let mut w = writer.lock().unwrap();
                    if let Err(err) = w.close() {
                        println!("stream close err: {err}");
                    }
                    println!("stream closing end after read_rtp error");
                    return Ok(());
                }
            }
            _ = notify.notified() => {
                println!("stream closing begin after notified");
                let mut w = writer.lock().unwrap();
                if let Err(err) = w.close() {
                    println!("stream close err: {err}");
                }
                println!("stream closing end after notified");
                return Ok(());
            }
        }
    }
}
