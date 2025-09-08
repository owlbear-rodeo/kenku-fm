use aes_gcm::{Error as CryptoError};
use discortp::discord::{IpDiscoveryPacket, IpDiscoveryType, MutableIpDiscoveryPacket};
use log::error;
use neon::context::Context;
use neon::prelude::FunctionContext;
use neon::prelude::*;
use neon::result::JsResult;
use neon::types::Finalize;
use neon::types::JsPromise;
use neon::types::JsString;
use std::{net::IpAddr, str::FromStr, sync::Arc};
use tokio::net::UdpSocket;
use tokio::runtime::Runtime;
use tokio::sync::Notify;

use crate::broadcast::Broadcast;
use crate::constants::runtime;
use crate::encrypt::CryptoMode;
use crate::encrypt::CryptoState;
use crate::rtc_udp;
use crate::{error::Error, error::Result};

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct IpDiscovery {
    pub address: IpAddr,
    pub port: u16,
}

pub struct VoiceConnection {
    pub udp_socket: Arc<UdpSocket>,
    pub ssrc: u32,
    /// A thread safe message used to disconnect the rtc_udp runner
    notify: Arc<Notify>
}

impl Finalize for VoiceConnection {}

/// The UDP connection for a Discord Voice call
///
/// This connection only supports the "xsalsa20_poly1305" encryption mode
impl VoiceConnection {
    pub async fn new(ip: String, port: u16, ssrc: u32) -> Result<Arc<Self>> {
        let udp = UdpSocket::bind("0.0.0.0:0").await?;
        udp.connect((ip, port)).await?;

        let udp_arc = Arc::new(udp);

        let notify = Arc::new(Notify::new());

        Ok(Arc::new(Self {
            udp_socket: udp_arc,
            ssrc,
            notify
        }))
    }

    /// Find the public IP used for the voice connection
    /// https://discord.com/developers/docs/topics/voice-connections#ip-discovery
    /// Code adapted from https://docs.rs/songbird/
    pub async fn discover_ip(&self) -> Result<IpDiscovery> {
        let mut bytes = [0; IpDiscoveryPacket::const_packet_size()];
        {
            let mut view = MutableIpDiscoveryPacket::new(&mut bytes[..]).expect(
                "Too few bytes in 'bytes' for IPDiscovery packet.\
                    (Blame: IpDiscoveryPacket::const_packet_size()?)",
            );
            view.set_pkt_type(IpDiscoveryType::Request);
            view.set_length(70);
            view.set_ssrc(self.ssrc);
        }

        self.udp_socket.send(&bytes).await?;

        let (len, _addr) = self.udp_socket.recv_from(&mut bytes).await?;
        let view = IpDiscoveryPacket::new(&bytes[..len]).ok_or(Error::IllegalDiscoveryResponse)?;

        if view.get_pkt_type() != IpDiscoveryType::Response {
            return Err(Error::IllegalDiscoveryResponse);
        }

        let nul_byte_index = view
            .get_address_raw()
            .iter()
            .position(|&b| b == 0)
            .ok_or(Error::IllegalIp)?;

        let address_str = std::str::from_utf8(&view.get_address_raw()[..nul_byte_index])
            .map_err(|_| Error::IllegalIp)?;

        let address = IpAddr::from_str(address_str).map_err(|e| {
            error!("{:?}", e);
            Error::IllegalIp
        })?;

        Ok(IpDiscovery {
            address,
            port: view.get_port(),
        })
    }

    /// Add the session secret key for encryption and connect the WebRTC stream
    /// https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-udp-connection-example-session-description-payload
    pub async fn connect(
        &self,
        secret_key: Vec<u8>,
        crypto_mode: String,
        broadcast: Arc<Broadcast>,
        rt: &Runtime,
    ) -> Result<()> {
        let crypto_mode = match CryptoMode::from_str(&crypto_mode) {
            Ok(v) => Ok(v),
            Err(_) => Err(Error::Crypto(CryptoError))
        }?;
        let cipher = match crypto_mode.cipher_from_key(&secret_key) {
            Ok(v) => Ok(v),
            Err(_) => Err(Error::Crypto(CryptoError))
        }?;
        let mut crypto_state = CryptoState::from(crypto_mode);

        let udp = Arc::clone(&self.udp_socket);
        let ssrc = self.ssrc;
        let notify = self.notify.clone();

        rt.spawn(async move {
            let (rtc_tx, rtc_rx) = flume::unbounded();
            let key = broadcast.register(rtc_tx);

            rtc_udp::runner(rtc_rx, udp, cipher, &mut crypto_state, ssrc, notify).await;

            broadcast.unregister(key);
        });

        Ok(())
    }

    pub async fn disconnect(&self) -> Result<()> {
        self.notify.notify_waiters();

        Ok(())
    }
}

impl VoiceConnection {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let ip = cx.argument::<JsString>(0)?.value(&mut cx);
        let port = cx.argument::<JsNumber>(1)?.value(&mut cx);
        let ssrc = cx.argument::<JsNumber>(2)?.value(&mut cx);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let voice_connection = VoiceConnection::new(ip, port as u16, ssrc as u32).await;
            deferred.settle_with(&channel, move |mut cx| match voice_connection {
                Ok(d) => Ok(cx.boxed(d)),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_discover_ip(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let voice_connection = Arc::clone(&&cx.argument::<JsBox<Arc<VoiceConnection>>>(0)?);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let protocol_data = voice_connection.discover_ip().await;

            deferred.settle_with(&channel, move |mut cx| match protocol_data {
                Ok(p) => {
                    let obj = cx.empty_object();

                    let address = cx.string(p.address.to_string());
                    obj.set(&mut cx, "address", address)?;

                    let port = cx.number(p.port);
                    obj.set(&mut cx, "port", port)?;

                    Ok(obj)
                }
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_connect(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let voice_connection = Arc::clone(&&cx.argument::<JsBox<Arc<VoiceConnection>>>(0)?);
        let secret_key_arr = cx.argument::<JsArray>(1)?.to_vec(&mut cx)?;
        let crypto_mode = cx.argument::<JsString>(2)?.value(&mut cx);
        let broadcast = Arc::clone(&&cx.argument::<JsBox<Arc<Broadcast>>>(3)?);

        let mut secret_key = Vec::new();

        for item in secret_key_arr {
            let num = item
                .downcast::<JsNumber, FunctionContext>(&mut cx)
                .unwrap()
                .value(&mut cx);
            secret_key.push(num as u8);
        }

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let connected = voice_connection.connect(secret_key, crypto_mode, broadcast, rt).await;

            deferred.settle_with(&channel, move |mut cx| match connected {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_disconnect(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let voice_connection = Arc::clone(&&cx.argument::<JsBox<Arc<VoiceConnection>>>(0)?);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let disconnected = voice_connection.disconnect().await;

            deferred.settle_with(&channel, move |mut cx| match disconnected {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }
}
