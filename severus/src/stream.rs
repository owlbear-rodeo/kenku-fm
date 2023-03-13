use anyhow::Result;
use byteorder::{LittleEndian, WriteBytesExt};
use bytes::{BufMut, Bytes, BytesMut};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
};
use tokio::sync::Notify;
use webrtc::{
    media::io::{
        ogg_reader::{
            PAGE_HEADER_SIGNATURE, PAGE_HEADER_SIZE, PAGE_HEADER_TYPE_CONTINUATION_OF_STREAM,
        },
        Writer,
    },
    track::track_remote::TrackRemote,
};

pub const PAGE_SIZE: usize = 60;

pub struct OpusReader {
    writer: Arc<Mutex<OpusWriter>>,
    read_page_index: u32,
}

impl OpusReader {
    pub fn new(writer: Arc<Mutex<OpusWriter>>) -> Self {
        let w = writer.lock().unwrap();
        // Start the reader at a full buffered pages behind
        let read_page_index = w.page_index - w.max_buffered_pages as u32;
        drop(w);
        OpusReader {
            writer,
            read_page_index,
        }
    }
}

impl Read for OpusReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let writer = self.writer.lock().unwrap();
        let buf_len = buf.len();
        let index = self.read_page_index % writer.max_buffered_pages as u32;

        let page_len = writer.pages[index as usize].len();

        // The songbird input will first read an i16 to determine the payload size
        // Detect this and read the next header
        if buf_len == 2 {
            if page_len < PAGE_HEADER_SIZE {
                // If we don't have enough data send an empty buffer
                buf.as_mut()
                    .write_i16::<LittleEndian>(writer.last_payload_size as i16)?;
                return Ok(buf_len);
            }
            // Get the payload size at index 27
            let payload_size = writer.pages[index as usize][27];

            buf.as_mut()
                .write_i16::<LittleEndian>(payload_size as i16)?;

            Ok(buf_len)
        } else {
            let payload_size = buf_len;
            if page_len < payload_size {
                // Return an empty payload if we don't have any data
                return Ok(payload_size);
            }
            let payload = &writer.pages[index as usize][PAGE_HEADER_SIZE + 1..];

            buf.as_mut().write_all(payload)?;

            self.read_page_index += 1;

            Ok(payload_size)
        }
    }
}

pub struct OpusWriter {
    pub pages: Vec<BytesMut>,
    pub sample_rate: u32,
    pub channel_count: u8,
    pub max_buffered_pages: usize,
    pub page_index: u32,
    serial: u32,
    previous_granule_position: u64,
    pub last_payload_size: usize,
}

impl OpusWriter {
    pub fn new(max_buffered_pages: usize) -> Result<Self> {
        let mut pages = Vec::with_capacity(max_buffered_pages);
        for i in 0..max_buffered_pages {
            let page = BytesMut::with_capacity(PAGE_SIZE);
            pages.insert(i, page);
        }
        Ok(OpusWriter {
            pages,
            sample_rate: 48000,
            channel_count: 2,
            max_buffered_pages,
            serial: rand::random::<u32>(),
            page_index: 0,
            previous_granule_position: 1,
            last_payload_size: 0,
        })
    }

    fn write_page(
        &mut self,
        payload: &mut Bytes,
        header_type: u8,
        granule_pos: u64,
        page_index: u32,
    ) -> Result<(), webrtc::media::Error> {
        self.last_payload_size = payload.len();

        let mut page = BytesMut::with_capacity(PAGE_HEADER_SIZE + 1 + self.last_payload_size);

        page.put(PAGE_HEADER_SIGNATURE); // page headers starts with 'OggS'//0-3
        page.put_u8(0); // Version//4
        page.put_u8(header_type); // 1 = continuation, 2 = beginning of stream, 4 = end of stream//5
        page.put_u64(granule_pos); // granule position //6-13
        page.put_u32(self.serial); // Bitstream serial number//14-17
        page.put_u32(page_index); // Page sequence number//18-21
        page.put_u32(0); //Checksum reserve //22-25
        page.put_u8(1); // Number of segments in page, giving always 1 segment //26
        page.put_u8(self.last_payload_size as u8); // Segment Table inserting at 27th position since page header length is 27
        page.put(payload.clone()); // inserting at 28th since Segment Table(1) + header length(27)

        let index = page_index % self.max_buffered_pages as u32;
        let buf = self.pages.get_mut(index as usize).unwrap();
        buf.clear();
        buf.put(page);

        Ok(())
    }
}

impl Writer for OpusWriter {
    fn write_rtp(
        &mut self,
        packet: &webrtc::rtp::packet::Packet,
    ) -> Result<(), webrtc::media::Error> {
        let mut payload = packet.payload.clone();
        if payload.is_empty() {
            return Err(webrtc::media::Error::ErrIncompleteFrameData);
        }

        self.write_page(
            &mut payload,
            PAGE_HEADER_TYPE_CONTINUATION_OF_STREAM,
            self.previous_granule_position,
            self.page_index,
        )?;
        self.page_index += 1;

        Ok(())
    }

    fn close(&mut self) -> Result<(), webrtc::media::Error> {
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
