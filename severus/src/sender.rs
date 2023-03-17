use anyhow::{anyhow, Result};
use async_trait::async_trait;
use discortp::{
    rtp::{MutableRtpPacket, RtpPacket},
    wrap::{Wrap16, Wrap32},
    MutablePacket,
};
use flume::Receiver;
use log::debug;
use rtp::packet::Packet;
use songbird::{
    constants::{RTP_PROFILE_TYPE, RTP_VERSION, VOICE_PACKET_MAX},
    driver::{
        tasks::message::{UdpTxMessage, WsMessage},
        CryptoState,
    },
    Event, EventContext, EventHandler,
};
use std::{
    io::Write,
    sync::{Arc, Mutex},
};
use xsalsa20poly1305::XSalsa20Poly1305 as Cipher;
use xsalsa20poly1305::TAG_SIZE;

pub struct Connection {
    ssrc: u32,
    udp_tx: flume::Sender<UdpTxMessage>,
    ws: flume::Sender<WsMessage>,
    cipher: Cipher,
}

pub struct DriverEvents {
    tx: flume::Sender<Option<Connection>>,
}

impl DriverEvents {
    pub fn new(tx: flume::Sender<Option<Connection>>) -> Self {
        DriverEvents { tx }
    }
}

#[async_trait]
impl EventHandler for DriverEvents {
    async fn act(&self, ctx: &EventContext<'_>) -> Option<Event> {
        if let EventContext::DriverConnect(connection, udp_tx, ws, c) = ctx {
            let conn = Connection {
                ssrc: connection.ssrc,
                udp_tx: udp_tx.clone(),
                ws: ws.clone(),
                cipher: (*c).clone(),
            };
            self.tx.send(Some(conn)).unwrap();
            debug!("driver connected");
        } else if let EventContext::DriverReconnect(connection, udp_tx, ws, c) = ctx {
            let conn = Connection {
                ssrc: connection.ssrc,
                udp_tx: udp_tx.clone(),
                ws: ws.clone(),
                cipher: (*c).clone(),
            };
            self.tx.send(Some(conn)).unwrap();
            debug!("driver reconnected");
        } else if let EventContext::DriverDisconnect(_) = ctx {
            self.tx.send(None).unwrap();
            debug!("driver disconnected");
        }
        None
    }
}

fn send_packet(
    rtp_packet: Packet,
    packet: &mut [u8],
    conn: &Connection,
    crypto: &mut CryptoState,
) -> Result<()> {
    let final_payload_size = {
        let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
            "FATAL: Too few bytes in self.packet for RTP header.\
          (Blame: VOICE_PACKET_MAX?)",
        );
        rtp.set_ssrc(conn.ssrc);
        rtp.set_timestamp(Wrap32::new(rtp_packet.header.timestamp));
        rtp.set_sequence(Wrap16::new(rtp_packet.header.sequence_number));
        let payload_len = rtp_packet.payload.len();

        let rtp_payload = rtp.payload_mut();
        rtp_payload[TAG_SIZE..]
            .as_mut()
            .write_all(&rtp_packet.payload)
            .unwrap();

        let final_payload_size = crypto.write_packet_nonce(&mut rtp, TAG_SIZE + payload_len);
        crypto
            .kind()
            .encrypt_in_place(&mut rtp, &conn.cipher, final_payload_size)
            .unwrap();
        final_payload_size
    };

    if let Err(_) = conn.ws.send(WsMessage::Speaking(true)) {
        return Err(anyhow!("ws error"));
    }

    let index = RtpPacket::minimum_packet_size() + final_payload_size;
    let data = packet[..index].to_vec();
    if let Err(_) = conn.udp_tx.send(UdpTxMessage::Packet(data)) {
        return Err(anyhow!("udp error"));
    }
    Ok(())
}

pub fn runner(rtp_rx: Receiver<Packet>, driver_rx: flume::Receiver<Option<Connection>>) -> () {
    let connection = Arc::new(Mutex::new(None));

    let conn2 = Arc::clone(&connection);
    let driver2 = driver_rx.clone();
    tokio::spawn(async move {
        let mut packet = [0u8; VOICE_PACKET_MAX];
        let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
            "FATAL: Too few bytes in self.packet for RTP header.\
            (Blame: VOICE_PACKET_MAX?)",
        );
        rtp.set_version(RTP_VERSION);
        rtp.set_payload_type(RTP_PROFILE_TYPE);

        let mut crypto = CryptoState::Normal;

        let rx = rtp_rx.clone();

        while let Ok(rtc_packet) = rx.recv_async().await {
            if driver2.is_disconnected() {
                break;
            }
            let mut conn_lock = conn2.lock().unwrap();
            if let Some(ref conn) = *conn_lock {
                if let Err(e) = send_packet(rtc_packet, &mut packet, &conn, &mut crypto) {
                    debug!("packet send failed, {}", e);
                    *conn_lock = None;
                }
            }
        }
        debug!("sender closed");
    });

    let conn3 = Arc::clone(&connection);
    let driver3 = driver_rx.clone();
    tokio::spawn(async move {
        while let Ok(connection) = driver3.recv_async().await {
            let mut conn_lock = conn3.lock().unwrap();
            *conn_lock = connection;
        }
        debug!("connection monitor closed");
    });
}
