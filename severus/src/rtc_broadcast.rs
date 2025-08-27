use anyhow::Result;
use log::debug;
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
    loop {
        tokio::select! {
            result = track.read_rtp() => {
                if let Ok((rtp_packet, _)) = result {
                    broadcast.send(rtp_packet);
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
