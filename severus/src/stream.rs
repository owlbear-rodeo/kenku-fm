use anyhow::Result;
use byteorder::{LittleEndian, WriteBytesExt};
use log::debug;
use rtp::{codecs::opus::OpusPacket, packet::Packet};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
};
use tokio::sync::Notify;
use webrtc::{
    media::{io::sample_builder::SampleBuilder, Sample},
    track::track_remote::TrackRemote,
};

pub struct OpusReader {
    builder: Arc<Mutex<OpusBuilder>>,
    payload_size: usize,
}

// Payload size for a 20ms frame at 64kbps
pub const PAYLOAD_SIZE: usize = 160;

impl OpusReader {
    pub fn new(builder: Arc<Mutex<OpusBuilder>>) -> Self {
        let mut builder_lock = builder.lock().unwrap();
        let payload_size = match builder_lock.pop() {
            Some(sample) => sample.data.len(),
            None => PAYLOAD_SIZE,
        };
        drop(builder_lock);
        OpusReader {
            builder,
            payload_size,
        }
    }
}

impl Read for OpusReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let buf_len = buf.len();

        // The songbird input will first read an i16 to determine the payload size
        if buf_len == 2 {
            buf.as_mut()
                .write_i16::<LittleEndian>(self.payload_size as i16)?;
            Ok(buf_len)
        } else {
            let mut builder_lock = self.builder.lock().unwrap();
            if let Some(sample) = builder_lock.pop() {
                buf.as_mut().write_all(&sample.data)?;
            }
            Ok(buf.len())
        }
    }
}

pub struct OpusBuilder {
    sample_builder: SampleBuilder<OpusPacket>,
    buffer_size: u32,
    high_watermark: u16,
}

impl OpusBuilder {
    pub fn new(high_watermark: u16) -> Self {
        let sample_builder = SampleBuilder::new(1, OpusPacket::default(), 48000);
        OpusBuilder {
            sample_builder,
            high_watermark,
            buffer_size: 0,
        }
    }

    pub fn push(&mut self, packet: Packet) -> () {
        if self.buffer_size < self.high_watermark as u32 {
            self.buffer_size += 1;
            self.sample_builder.push(packet);
        }
    }

    pub fn pop(&mut self) -> Option<Sample> {
        let sample = self.sample_builder.pop();
        if sample.is_some() {
            self.buffer_size -= 1;
        }
        sample
    }
}

pub async fn write_to_builder(
    builder: Arc<Mutex<OpusBuilder>>,
    track: Arc<TrackRemote>,
    notify: Arc<Notify>,
) -> Result<()> {
    loop {
        tokio::select! {
            result = track.read_rtp() => {
                if let Ok((rtp_packet, _)) = result {
                    if !rtp_packet.payload.is_empty() {
                        let mut builder_lock = builder.lock().unwrap();
                        builder_lock.push(rtp_packet);
                    }
                } else {
                    debug!("stream closing after read_rtp error");
                    return Ok(());
                }
            }
            _ = notify.notified() => {
                debug!("stream closing after notified");
                return Ok(());
            }
        }
    }
}
