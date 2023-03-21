use anyhow::Result;
use bus::{Bus, BusReader};
use log::debug;
use rand::random;
use rtp::packet::Packet;
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use webrtc::track::track_remote::TrackRemote;

pub struct OpusEvents {
    bus: Bus<Packet>,
}

impl OpusEvents {
    pub fn new() -> Self {
        OpusEvents { bus: Bus::new(10) }
    }

    pub fn notify(&mut self, packet: Packet) -> () {
        self.bus.broadcast(packet);
    }

    pub fn get_receiver(&mut self) -> BusReader<Packet> {
        self.bus.add_rx()
    }
}

pub async fn runner(
    events: Arc<Mutex<OpusEvents>>,
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
                        let mut events_lock = events.lock().await;
                        events_lock.notify(rtp_packet);
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
