use anyhow::{anyhow, Result};
use async_trait::async_trait;
use bytes::Bytes;
use discortp::{
    rtp::{MutableRtpPacket, RtpPacket},
    MutablePacket,
};
use log::debug;
use rand::random;
use rtp::{codecs::opus::OpusPacket, packet::Packet};
use songbird::{
    constants::{MONO_FRAME_SIZE, RTP_PROFILE_TYPE, RTP_VERSION, VOICE_PACKET_MAX},
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
use tokio::sync::watch::Receiver;
use webrtc::media::io::sample_builder::SampleBuilder;
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

fn send_payload(
    payload: Bytes,
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
        let payload_len = payload.len();

        let rtp_payload = rtp.payload_mut();
        rtp_payload[TAG_SIZE..]
            .as_mut()
            .write_all(&payload)
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
    if let Err(_) = conn
        .udp_tx
        .send(UdpTxMessage::Packet(packet[..index].to_vec()))
    {
        return Err(anyhow!("udp error"));
    }

    let mut rtp = MutableRtpPacket::new(&mut packet[..]).expect(
        "FATAL: Too few bytes in self.packet for RTP header.\
          (Blame: VOICE_PACKET_MAX?)",
    );
    rtp.set_sequence(rtp.get_sequence() + 1);
    rtp.set_timestamp(rtp.get_timestamp() + MONO_FRAME_SIZE as u32);

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
        rtp.set_sequence(random::<u16>().into());
        rtp.set_timestamp(random::<u32>().into());

        let mut crypto = CryptoState::Normal;

        let mut rx = rtp_rx.clone();

        let mut sample_builder = SampleBuilder::new(10, OpusPacket::default(), 48000);

        while rx.changed().await.is_ok() && !driver2.is_disconnected() {
            let rtc_packet = rx.borrow().clone();
            sample_builder.push(rtc_packet);
            let mut conn_lock = conn2.lock().unwrap();
            if let Some(ref conn) = *conn_lock {
                let sample = sample_builder.pop();
                if let Some(s) = sample {
                    if let Err(e) = send_payload(s.data, &mut packet, &conn, &mut crypto) {
                        debug!("packet send failed, {}", e);
                        *conn_lock = None;
                    }
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
