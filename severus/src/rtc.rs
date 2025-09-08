use anyhow::Result;
use log::debug;
use neon::prelude::{Context, FunctionContext, Object};
use neon::result::JsResult;
use neon::types::{Finalize, JsBox, JsFunction, JsPromise, JsString, JsUndefined};
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::Notify;
use webrtc::api::interceptor_registry::register_default_interceptors;
use webrtc::api::media_engine::{MediaEngine, MIME_TYPE_OPUS};
use webrtc::api::APIBuilder;
use webrtc::ice_transport::ice_candidate::{RTCIceCandidate, RTCIceCandidateInit};
use webrtc::ice_transport::ice_connection_state::RTCIceConnectionState;
use webrtc::interceptor::registry::Registry;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::rtp_transceiver::rtp_codec::{
    RTCRtpCodecCapability, RTCRtpCodecParameters, RTPCodecType,
};

use crate::broadcast::Broadcast;
use crate::constants::runtime;
use crate::rtc_broadcast::runner;

pub struct RTC {
    connection: RTCPeerConnection,
    notify: Arc<Notify>,
}

impl Finalize for RTC {}

impl RTC {
    async fn new(broadcast: Arc<Broadcast>, rt: &Runtime) -> Result<Arc<Self>> {
        // Create a MediaEngine object to configure the supported codec
        let mut media_engine = MediaEngine::default();
        media_engine.register_codec(
            RTCRtpCodecParameters {
                capability: RTCRtpCodecCapability {
                    mime_type: MIME_TYPE_OPUS.to_owned(),
                    clock_rate: 48000,
                    channels: 2,
                    sdp_fmtp_line: "".to_owned(),
                    rtcp_feedback: vec![],
                },
                payload_type: 111,
                ..Default::default()
            },
            RTPCodecType::Audio,
        )?;

        let mut registry = Registry::new();
        registry = register_default_interceptors(registry, &mut media_engine)?;
        let api = APIBuilder::new()
            .with_media_engine(media_engine)
            .with_interceptor_registry(registry)
            .build();

        let config = RTCConfiguration {
            ..Default::default()
        };

        debug!("new rtc connection started");
        let connection = api.new_peer_connection(config).await?;

        connection
            .add_transceiver_from_kind(RTPCodecType::Audio, None)
            .await?;

        let (track_tx, track_rx) = flume::unbounded();
        connection.on_track(Box::new(move |track, _, _| {
            let track_tx2 = track_tx.clone();
            Box::pin(async move {
                let codec = track.codec();
                let mime_type = codec.capability.mime_type.to_lowercase();
                if mime_type == MIME_TYPE_OPUS.to_lowercase() {
                    let _ = track_tx2.send_async(track).await;
                }
            })
        }));

        let notify_tx = Arc::new(Notify::new());
        let notify_rx = Arc::clone(&notify_tx);
        rt.spawn(async move {
            if let Ok(track) = track_rx.recv_async().await {
                let _ = runner(broadcast, track, notify_rx).await;
            }
        });

        let notify_tx2 = Arc::clone(&notify_tx);
        // Set the handler for ICE connection state
        // This will notify you when the peer has connected/disconnected
        connection.on_ice_connection_state_change(Box::new(
            move |connection_state: RTCIceConnectionState| {
                debug!("RTC Connection State has changed {connection_state}");
                if connection_state == RTCIceConnectionState::Connected {
                    debug!("RTC connected");
                } else if connection_state == RTCIceConnectionState::Closed {
                    debug!("RTC closed");
                    notify_tx2.notify_waiters();
                } else if connection_state == RTCIceConnectionState::Disconnected {
                    debug!("RTC disconnected");
                    notify_tx2.notify_waiters();
                } else if connection_state == RTCIceConnectionState::Failed {
                    debug!("RTC failed");
                    notify_tx2.notify_waiters();
                }
                Box::pin(async {})
            },
        ));

        Ok(Arc::new(Self {
            connection,
            notify: Arc::clone(&notify_tx),
        }))
    }

    async fn signal(&self, offer: RTCSessionDescription) -> Result<RTCSessionDescription> {
        self.connection.set_remote_description(offer).await?;

        // Create an answer
        let answer = self.connection.create_answer(None).await?;

        // Sets the LocalDescription, and starts our UDP listeners
        self.connection.set_local_description(answer).await?;

        let local_desc = self.connection.local_description().await;

        match local_desc {
            Some(d) => Ok(d),
            None => Err(anyhow::anyhow!("No local description found")),
        }
    }

    async fn add_candidate(&self, candidate: RTCIceCandidateInit) -> Result<()> {
        self.connection.add_ice_candidate(candidate).await?;

        Ok(())
    }

    fn on_candidate(&self, tx: tokio::sync::mpsc::Sender<RTCIceCandidate>) -> () {
        self.connection.on_ice_candidate(Box::new(move |candidate| {
            if let Some(candidate) = candidate {
                let _ = tx.try_send(candidate);
            }
            Box::pin(async move {})
        }));
    }

    fn on_closed(&self, tx: tokio::sync::mpsc::Sender<()>) -> () {
        self.connection.on_ice_connection_state_change(Box::new(
            move |connection_state: RTCIceConnectionState| {
                if connection_state == RTCIceConnectionState::Closed
                    || connection_state == RTCIceConnectionState::Disconnected
                    || connection_state == RTCIceConnectionState::Failed
                {
                    let _ = tx.try_send(());
                }
                Box::pin(async {})
            },
        ));
    }

    async fn close(&self) -> Result<()> {
        debug!("closing RTC connection");
        self.notify.notify_waiters();
        self.connection.close().await?;

        Ok(())
    }
}

impl RTC {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let broadcast = Arc::clone(&&cx.argument::<JsBox<Arc<Broadcast>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let rtc = RTC::new(broadcast, rt).await;
            deferred.settle_with(&channel, move |mut cx| match rtc {
                Ok(r) => Ok(cx.boxed(r)),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_signal(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let offer_str = cx.argument::<JsString>(1)?.value(&mut cx);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let offer = serde_json::from_str::<RTCSessionDescription>(&offer_str)
                .expect("Unable to convert signal from JSON");
            let answer = rtc.signal(offer).await;

            deferred.settle_with(&channel, move |mut cx| match answer {
                Ok(a) => {
                    let json_str =
                        serde_json::to_string(&a).expect("Unable to convert signal to JSON");
                    Ok(cx.string(json_str))
                }
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_add_candidate(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let candidate_str = cx.argument::<JsString>(1)?.value(&mut cx);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let candidate = serde_json::from_str::<RTCIceCandidateInit>(&candidate_str)
                .expect("Unable to convert candidate from JSON");
            let result = rtc.add_candidate(candidate).await;

            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_on_candidate(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let candidate_cb = Arc::new(cx.argument::<JsFunction>(1)?.root(&mut cx));
        let channel = cx.channel();

        let (tx, mut rx) = tokio::sync::mpsc::channel(1);

        rt.spawn(async move {
            rtc.on_candidate(tx);
            while let Some(candidate) = rx.recv().await {
                let candidate_cb = Arc::clone(&candidate_cb);
                channel.send(move |mut cx| {
                    let callback = candidate_cb.to_inner(&mut cx);
                    let this = cx.undefined();
                    let json = candidate
                        .to_json()
                        .expect("Unable to convert ice candidate to json");
                    let json_str =
                        serde_json::to_string(&json).expect("Unable to convert candidate to JSON");
                    let args = vec![cx.string(json_str).upcast()];
                    callback.call(&mut cx, this, args)?;

                    Ok(())
                });
            }
        });

        Ok(cx.undefined())
    }

    pub fn js_on_close(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let close_cb = Arc::new(cx.argument::<JsFunction>(1)?.root(&mut cx));
        let channel = cx.channel();

        let (tx, mut rx) = tokio::sync::mpsc::channel(1);

        rt.spawn(async move {
            rtc.on_closed(tx);
            while let Some(_) = rx.recv().await {
                let close_cb = Arc::clone(&close_cb);
                channel.send(move |mut cx| {
                    let callback = close_cb.to_inner(&mut cx);
                    let this = cx.undefined();
                    let args = vec![];
                    callback.call(&mut cx, this, args)?;

                    Ok(())
                });
            }
        });

        Ok(cx.undefined())
    }

    pub fn js_close(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let c = rtc.close().await;
            deferred.settle_with(&channel, move |mut cx| match c {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }
}
