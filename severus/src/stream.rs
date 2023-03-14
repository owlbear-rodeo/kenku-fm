use anyhow::Result;
use byteorder::{LittleEndian, WriteBytesExt};
use futures::executor::block_on;
use log::debug;
use rtp::{codecs::opus::OpusPacket, packet::Packet};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
};
use tokio::sync::{
    watch::{self, Receiver, Sender},
    Notify,
};
use webrtc::{
    media::{io::sample_builder::SampleBuilder, Sample},
    track::track_remote::TrackRemote,
};

pub struct OpusReader {
    rx: Receiver<Packet>,
    builder: Arc<Mutex<OpusBuilder>>,
}

// Payload size for a 20ms frame at 64kbps
pub const PAYLOAD_SIZE: usize = 160;

impl OpusReader {
    pub fn new(rx: Receiver<Packet>) -> Self {
        let builder = Arc::new(Mutex::new(OpusBuilder::new()));

        let mut rx2 = rx.clone();
        let builder2 = Arc::clone(&builder);
        tokio::spawn(async move {
            while rx2.changed().await.is_ok() {
                let mut builder_lock = builder2.lock().unwrap();
                builder_lock.push(rx2.borrow().clone());
                drop(builder_lock);
            }
        });

        OpusReader { rx, builder }
    }
}

impl Read for OpusReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let buf_len = buf.len();

        // The songbird input will first read an i16 to determine the payload size
        if buf_len == 2 {
            buf.as_mut()
                .write_i16::<LittleEndian>(PAYLOAD_SIZE as i16)?;
            Ok(buf_len)
        } else {
            let mut builder_lock = self.builder.lock().unwrap();
            let sample = builder_lock.pop();
            drop(builder_lock);
            if let Some(s) = sample {
                buf.as_mut().write_all(&s.data)?;
            } else {
                let mut rx = self.rx.clone();
                // If we run out of packets wait until we have more
                let packet = block_on(async {
                    rx.changed().await.unwrap();
                    rx.borrow()
                });
                buf.as_mut().write_all(&packet.payload)?;
            }
            Ok(buf.len())
        }
    }
}

struct OpusBuilder {
    sample_builder: SampleBuilder<OpusPacket>,
    buffer_size: u32,
    high_watermark: u16,
}

impl OpusBuilder {
    pub fn new() -> Self {
        let max_late = 10; // 200ms
        let high_watermark = 50; // 1s
        let sample_builder = SampleBuilder::new(max_late, OpusPacket::default(), 48000);
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

pub struct OpusEvents {
    tx: Sender<Packet>,
    pub rx: Receiver<Packet>,
}

impl OpusEvents {
    pub fn new() -> Self {
        let packet = Packet::default();
        let (tx, rx) = watch::channel(packet);
        OpusEvents { tx, rx }
    }

    pub fn notify(&self, packet: Packet) -> () {
        if let Err(e) = self.tx.send(packet) {
            debug!("stream notify failed: {}", e);
        }
    }
}

pub async fn runner(
    events: Arc<OpusEvents>,
    track: Arc<TrackRemote>,
    notify: Arc<Notify>,
) -> Result<()> {
    loop {
        tokio::select! {
            result = track.read_rtp() => {
                if let Ok((rtp_packet, _)) = result {
                    if !rtp_packet.payload.is_empty() {
                        events.notify(rtp_packet);
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
