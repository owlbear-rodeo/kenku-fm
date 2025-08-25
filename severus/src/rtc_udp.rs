use discortp::{
    rtp::{MutableRtpPacket, RtpPacket},
    wrap::{Wrap16, Wrap32},
    MutablePacket,
};
use flume::Receiver;
use log::{debug, error};
use rtp::packet::Packet;
use std::{io::Write, sync::Arc};
use tokio::net::UdpSocket;
use tokio::sync::Notify;

use crate::{
    constants::{RTP_PROFILE_TYPE, RTP_VERSION, VOICE_PACKET_MAX},
    encrypt::{Cipher, CryptoState},
};

/// Convert and encrypt a WebRTC packet to a Discord packet
fn apply_rtc_packet(
    rtc_packet: Packet,
    packet: &mut [u8],
    cipher: &Cipher,
    crypto_state: &mut CryptoState,
) -> usize {
    let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
        "FATAL: Too few bytes in self.packet for RTP header.\
      (Blame: VOICE_PACKET_MAX?)",
    );
    rtp.set_timestamp(Wrap32::new(rtc_packet.header.timestamp));
    rtp.set_sequence(Wrap16::new(rtc_packet.header.sequence_number));

    let payload_len = rtc_packet.payload.len();
    let rtp_payload = rtp.payload_mut();
    rtp_payload.as_mut().write_all(&rtc_packet.payload).unwrap();

    let final_payload_size = crypto_state.write_packet_nonce(&mut rtp, payload_len);
    cipher
        .encrypt_pkt_in_place(&mut rtp, final_payload_size)
        .unwrap();
    final_payload_size
}

/// Take a WebRTC broadcast and re-broadcast it to a Discord UDP transmitter
pub async fn runner(
    rtc_rx: Receiver<Packet>,
    udp_tx: Arc<UdpSocket>,
    cipher: Cipher,
    crypto_state: &mut CryptoState,
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
                if let Ok(rtc_packet) = result {
                    let final_payload_size = apply_rtc_packet(rtc_packet, &mut packet, &cipher, crypto_state);
                        let index = RtpPacket::minimum_packet_size() + final_payload_size;
                        if let Err(e) = udp_tx.send(&packet[..index]).await {
                            error!("Fatal UDP packet send error: {:?}.", e);
                            break;
                        }
                }
            }
            _ = notify.notified() => {
                break;
            }
        }
    }
    debug!("udp sender closed");
}
