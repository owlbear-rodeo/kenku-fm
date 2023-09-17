use flume::{Receiver, Sender};
use log::debug;
use rand::random;
use rtp::packet::Packet;
use std::{sync::Arc, time::Duration};
use tokio::sync::Notify;
use webrtc::track::track_remote::TrackRemote;

use crate::broadcast::Broadcast;

const PACKET_BUFFER_LENGTH: usize = 10;
const PACKET_SEND_TIME: Duration = Duration::from_millis(20);

struct PacketTx {
    track: Arc<TrackRemote>,
    notify: Arc<Notify>,
}

impl PacketTx {
    async fn run(&self, tx: Sender<Packet>) -> () {
        let mut sequence_number: u16 = random::<u16>();
        loop {
            tokio::select! {
                result = self.track.read_rtp() => {
                    if let Ok((mut rtp_packet, _)) = result {
                        if !rtp_packet.payload.is_empty() {
                            rtp_packet.header.sequence_number = sequence_number;
                            if let Err(_) = tx.send(rtp_packet) {
                                debug!("packet tx closing after send_rtp error");
                                return;
                            }
                            sequence_number = sequence_number.wrapping_add(1);
                        }
                    } else {
                        debug!("packet tx closing after read_rtp error");
                        return;
                    }
                }
                _ = self.notify.notified() => {
                    debug!("packet tx closing after notified");
                    return;
                }
            }
        }
    }
}

/// Buffer incoming RTC packets and re-broadcast them at a fixed interval
struct PacketBroadcast {
    broadcast: Arc<Broadcast>,
}

impl PacketBroadcast {
    async fn run(&self, rx: Receiver<Packet>) -> () {
        let mut interval = tokio::time::interval(PACKET_SEND_TIME);
        let mut buffering = true;

        loop {
            if rx.is_disconnected() {
                break;
            }
            interval.tick().await;
            if buffering && rx.len() == PACKET_BUFFER_LENGTH {
                debug!("packet buffer ready");
                buffering = false;
            } else if !buffering && rx.len() == 0 {
                debug!("packet buffer empty");
                buffering = true;
            }

            if !buffering {
                if let Ok(packet) = rx.recv_timeout(PACKET_SEND_TIME) {
                    self.broadcast.send(packet);
                } else {
                    debug!("packet broadcast timeout")
                }
            }
        }

        debug!("packet broadcast ended");
    }
}

/// Take incoming WebRTC packets and broadcast them to a OpusEvents bus
pub async fn runner(broadcast: Arc<Broadcast>, track: Arc<TrackRemote>, notify: Arc<Notify>) -> () {
    let (tx, rx) = flume::unbounded();
    let packet_tx = PacketTx { track, notify };
    let packet_broadcast = PacketBroadcast { broadcast };

    tokio::join!(packet_tx.run(tx), packet_broadcast.run(rx));
}
