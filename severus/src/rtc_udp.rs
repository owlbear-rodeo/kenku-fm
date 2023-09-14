use crypto_secretbox::XSalsa20Poly1305 as Cipher;
use discortp::{
    rtp::{MutableRtpPacket, RtpPacket},
    MutablePacket,
};
use flume::Receiver;
use log::{debug, error};
use std::{io::Write, sync::Arc};
use tokio::net::UdpSocket;
use tokio::sync::Notify;

use crate::{
    constants::{FRAME_SIZE, RTP_PROFILE_TYPE, RTP_VERSION, VOICE_PACKET_MAX},
    encrypt::{encrypt_in_place, TAG_SIZE},
};

/// Take a WebRTC broadcast and re-broadcast it to a Discord UDP transmitter
pub async fn runner(
    rtc_rx: Receiver<Vec<u8>>,
    udp_tx: Arc<UdpSocket>,
    cipher: Cipher,
    ssrc: u32,
    notify: Arc<Notify>,
) -> () {
    let mut packet = [0u8; VOICE_PACKET_MAX];
    let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
        "FATAL: Too few bytes in self.packet for RTP header.\
        (Blame: VOICE_PACKET_MAX?)",
    );
    rtp.set_version(RTP_VERSION);
    rtp.set_payload_type(RTP_PROFILE_TYPE);
    rtp.set_ssrc(ssrc);

    loop {
        tokio::select! {
            result = rtc_rx.recv_async() => {
                if let Ok(data) = result {
                    let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
                        "FATAL: Too few bytes in self.packet for RTP header.\
                      (Blame: VOICE_PACKET_MAX?)",
                    );
                    let payload_len = data.len();

                    let rtp_payload = rtp.payload_mut();
                    rtp_payload[TAG_SIZE..].as_mut().write_all(&data).unwrap();

                    let final_payload_size = TAG_SIZE + payload_len;
                    encrypt_in_place(&mut rtp, &cipher, final_payload_size).unwrap();

                    let index = RtpPacket::minimum_packet_size() + final_payload_size;
                    if let Err(e) = udp_tx.send(&packet[..index]).await {
                        error!("Fatal UDP packet send error: {:?}.", e);
                        break;
                    }

                    // Increment sequence and timestamp
                    let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
                        "FATAL: Too few bytes in self.packet for RTP header.\
                            (Blame: VOICE_PACKET_MAX?)",
                    );
                    rtp.set_sequence(rtp.get_sequence() + 1);
                    rtp.set_timestamp(rtp.get_timestamp() + FRAME_SIZE as u32);
                }
            }
            _ = notify.notified() => {
                break;
            }
        }
    }
    debug!("udp sender closed");
}
