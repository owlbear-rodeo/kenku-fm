use anyhow::Result;
use audiopus::{coder::Encoder, Application, Channels};
use log::debug;
use std::sync::Arc;
use tokio::{net::UdpSocket, sync::Notify};

use crate::{
    broadcast::Broadcast,
    constants::{DEFAULT_BITRATE, SAMPLE_RATE, STEREO_FRAME_SIZE, VOICE_PACKET_MAX},
};

/// Take incoming UDP packets and convert them from PCM to Opus then broadcast the packets
pub async fn runner(
    broadcast: Arc<Broadcast>,
    udp: Arc<UdpSocket>,
    notify: Arc<Notify>,
) -> Result<()> {
    let mut buffer = [0u8; STEREO_FRAME_SIZE * 2];
    let mut encoded = [0u8; VOICE_PACKET_MAX];

    let mut encoder = Encoder::new(SAMPLE_RATE, Channels::Stereo, Application::Audio)?;
    encoder.set_bitrate(DEFAULT_BITRATE)?;

    loop {
        tokio::select! {
            result = udp.recv_from(&mut buffer[..]) => {
                if let Ok((_len, _addr)) = result {
                    let (_head, pcm_buffer, _tail) = unsafe { buffer.align_to::<i16>() };

                    match encoder.encode(&pcm_buffer, &mut encoded) {
                        Ok(len) => {
                            let data = encoded[..len].to_vec();
                            broadcast.send(data);
                        }
                        Err(e) => {
                            debug!("err {:?}", e.to_string());
                        }
                    }
                } else {
                    debug!("stream closing after udp read error");
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
