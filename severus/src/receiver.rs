use anyhow::Result;
use flume::{Receiver, Sender};
use log::debug;
use rand::random;
use rtp::packet::Packet;
use std::sync::Arc;
use tokio::sync::Notify;
use webrtc::track::track_remote::TrackRemote;

pub struct OpusEvents {
    tx: Sender<Packet>,
    pub rx: Receiver<Packet>,
}

impl OpusEvents {
    pub fn new() -> Self {
        let (tx, rx) = flume::unbounded();
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
    let mut sequence_number: u16 = random::<u16>();
    loop {
        tokio::select! {
            result = track.read_rtp() => {
                if let Ok((mut rtp_packet, _)) = result {
                    if !rtp_packet.payload.is_empty() {
                        // Re-sequence the packets to remove empty payloads
                        rtp_packet.header.sequence_number = sequence_number;
                        events.notify(rtp_packet);
                        sequence_number = sequence_number.wrapping_add(1);
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
