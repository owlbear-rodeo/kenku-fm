use anyhow::Result;
use audiopus::{coder::Encoder, Application, Channels};
use flume::Receiver;
use futures::StreamExt;
use livekit_webrtc::{audio_stream::native::NativeAudioStream, prelude::RtcAudioTrack};
use log::debug;
use std::sync::Arc;
use tokio::sync::Notify;

use crate::{
    broadcast::Broadcast,
    constants::{BITRATE, FRAME_SIZE, SAMPLE_RATE, SAMPLE_RATE_RAW, VOICE_PACKET_MAX},
};

/// Take incoming WebRTC packets and broadcast them to a OpusEvents bus
pub async fn runner(
    broadcast: Arc<Broadcast>,
    track_rx: Receiver<RtcAudioTrack>,
    notify: Arc<Notify>,
) -> Result<()> {
    tokio::select! {
        result = track_rx.recv_async() => {
            if let Ok(track) = result {
                let mut encoder = Encoder::new(SAMPLE_RATE, Channels::Stereo, Application::Audio)?;
                encoder.set_bitrate(BITRATE)?;

                let mut encoded = [0u8; VOICE_PACKET_MAX];
                let mut stream = NativeAudioStream::new(track);

                loop {
                    tokio::select! {
                        result = stream.next() => {
                            if let Some(frame) = result {
                                let valid_frame =
                                    frame.num_channels == 2 &&
                                    frame.sample_rate == SAMPLE_RATE_RAW as u32 &&
                                    frame.samples_per_channel == FRAME_SIZE as u32;

                                if valid_frame {
                                    match encoder.encode(&frame.data, &mut encoded) {
                                            Ok(len) => {
                                                let data = encoded[..len].to_vec();
                                                broadcast.send(data);
                                            }
                                            Err(e) => {
                                                debug!("err {:?}", e.to_string());
                                            }
                                        }
                                } else {
                                    debug!("invalid frame with {} channels, {}hz sample rate and {} samples per channel", frame.num_channels, frame.sample_rate, frame.samples_per_channel);
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
            } else {
                debug!("stream closing after track read error");
                return Ok(());
            }
        }
        _ = notify.notified() => {
            debug!("stream closing after notified");
            return Ok(());
        }
    }
}
