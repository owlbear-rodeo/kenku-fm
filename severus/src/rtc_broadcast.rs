use anyhow::Result;
use log::debug;
use rand::random;
use std::sync::Arc;
use tokio::sync::Notify;
use webrtc::track::track_remote::TrackRemote;

use crate::broadcast::Broadcast;

/// Take incoming WebRTC packets and broadcast them to a OpusEvents bus
pub async fn runner(
    broadcast: Arc<Broadcast>,
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
                        let mut events_lock = broadcast.events.lock().await;
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
