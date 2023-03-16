use anyhow::Result;
use log::debug;
use rtp::packet::Packet;
use std::sync::Arc;
use tokio::sync::{
    watch::{self, Receiver, Sender},
    Notify,
};
use webrtc::track::track_remote::TrackRemote;

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
                    events.notify(rtp_packet);
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
