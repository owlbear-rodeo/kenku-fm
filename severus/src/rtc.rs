use anyhow::Result;
use log::debug;
use neon::prelude::{Context, FunctionContext};
use neon::result::{JsResult, NeonResult};
use neon::types::{Finalize, JsBox, JsPromise, JsString};
use once_cell::sync::OnceCell;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::Notify;
use webrtc::api::interceptor_registry::register_default_interceptors;
use webrtc::api::media_engine::{MediaEngine, MIME_TYPE_OPUS};
use webrtc::api::APIBuilder;
use webrtc::ice_transport::ice_connection_state::RTCIceConnectionState;
use webrtc::interceptor::registry::Registry;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::rtp_transceiver::rtp_codec::{
    RTCRtpCodecCapability, RTCRtpCodecParameters, RTPCodecType,
};

use crate::stream::{runner, OpusEvents};

static RUNTIME: OnceCell<Runtime> = OnceCell::new();

fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}

pub struct RTC {
    connection: RTCPeerConnection,
    pub events: Arc<OpusEvents>,
}

impl Finalize for RTC {}

impl RTC {
    async fn new() -> Result<Arc<Self>> {
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

        let connection = api.new_peer_connection(config).await?;

        connection
            .add_transceiver_from_kind(RTPCodecType::Audio, None)
            .await?;

        let events = Arc::new(OpusEvents::new());

        Ok(Arc::new(Self { connection, events }))
    }
    async fn signal(&self, offer: RTCSessionDescription) -> Result<RTCSessionDescription> {
        self.connection.set_remote_description(offer).await?;

        // Create an answer
        let answer = self.connection.create_answer(None).await?;

        // Create channel that is blocked until ICE Gathering is complete
        let mut gather_complete = self.connection.gathering_complete_promise().await;

        // Sets the LocalDescription, and starts our UDP listeners
        self.connection.set_local_description(answer).await?;

        // Block until ICE Gathering is complete, disabling trickle ICE
        let _ = gather_complete.recv().await;

        let local_desc = self.connection.local_description().await;
        match local_desc {
            Some(d) => Ok(d),
            None => Err(anyhow::anyhow!("No local description found")),
        }
    }
    async fn start_stream(&self) -> Result<()> {
        let notify_tx = Arc::new(Notify::new());
        let notify_rx = notify_tx.clone();

        let events = Arc::clone(&self.events);

        self.connection.on_track(Box::new(move |track, _, _| {
            let notify_rx2 = Arc::clone(&notify_rx);
            let events2 = Arc::clone(&events);
            Box::pin(async move {
                let codec = track.codec();
                let mime_type = codec.capability.mime_type.to_lowercase();
                if mime_type == MIME_TYPE_OPUS.to_lowercase() {
                    let _ = runner(events2, track, notify_rx2).await;
                }
            })
        }));

        let (done_tx, mut done_rx) = tokio::sync::mpsc::channel::<()>(1);

        // Set the handler for ICE connection state
        // This will notify you when the peer has connected/disconnected
        self.connection.on_ice_connection_state_change(Box::new(
            move |connection_state: RTCIceConnectionState| {
                debug!("RTC Connection State has changed {connection_state}");
                if connection_state == RTCIceConnectionState::Connected {
                    debug!("RTC connected");
                } else if connection_state == RTCIceConnectionState::Failed {
                    debug!("RTC failed");
                    notify_tx.notify_waiters();
                    let _ = done_tx.try_send(());
                }
                Box::pin(async {})
            },
        ));

        done_rx.recv().await;

        Ok(())
    }
}

impl RTC {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let rtc = RTC::new().await;
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

    pub fn js_start_stream(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let rec = rtc.start_stream().await;
            deferred.settle_with(&channel, move |mut cx| match rec {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }
}
