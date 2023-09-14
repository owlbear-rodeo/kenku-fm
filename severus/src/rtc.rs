use std::sync::Arc;

use anyhow::Result;
use livekit_webrtc::{
    prelude::{
        AnswerOptions, ContinualGatheringPolicy, IceCandidate, IceServer, IceTransportsType,
        MediaStreamTrack, PeerConnection, PeerConnectionFactory, PeerConnectionState,
        RtcConfiguration,
    },
    session_description::{SdpType, SessionDescription},
};
use log::debug;
use neon::prelude::{Context, FunctionContext, Object};
use neon::result::JsResult;
use neon::types::{Finalize, JsBox, JsFunction, JsPromise, JsString, JsUndefined};
use serde::{Deserialize, Serialize};
use tokio::{
    runtime::Runtime,
    sync::{mpsc::Sender, Notify},
};

use crate::{broadcast::Broadcast, constants::runtime, rtc_broadcast::runner};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct IceCandidateJson {
    pub sdp_mid: String,
    pub sdp_m_line_index: i32,
    pub candidate: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct SessionDescriptionJson {
    #[serde(rename = "type")]
    pub t: String,
    pub sdp: String,
}

pub struct RTC {
    connection: Arc<PeerConnection>,
    notify: Arc<Notify>,
}

impl Finalize for RTC {}

impl RTC {
    fn new(broadcast: Arc<Broadcast>, rt: &Runtime) -> Result<Arc<Self>> {
        let factory = PeerConnectionFactory::default();

        let config = RtcConfiguration {
            ice_servers: vec![IceServer {
                urls: vec!["stun:stun.l.google.com:19302".to_string()],
                username: "".into(),
                password: "".into(),
            }],
            continual_gathering_policy: ContinualGatheringPolicy::GatherOnce,
            ice_transport_type: IceTransportsType::All,
        };

        let connection = factory.create_peer_connection(config)?;

        let notify_rx = Arc::new(Notify::new());
        let notify_tx = Arc::clone(&notify_rx);

        let arc_connection = Arc::new(connection);

        let conn = Arc::clone(&arc_connection);
        let (track_tx, track_rx) = flume::unbounded();

        conn.on_track(Some(Box::new(move |event| {
            debug!("new track added");
            if let MediaStreamTrack::Audio(audio_track) = event.track {
                let _ = track_tx.try_send(audio_track);
            }
        })));

        rt.spawn(runner(Arc::clone(&broadcast), track_rx, notify_rx));

        Ok(Arc::new(Self {
            connection: arc_connection,
            notify: notify_tx,
        }))
    }

    async fn signal(&self, offer: SessionDescription) -> Result<SessionDescription> {
        self.connection.set_remote_description(offer).await?;

        let answer = self
            .connection
            .create_answer(AnswerOptions::default())
            .await?;

        let sdp = answer.to_string().replace(
            "minptime=10;useinbandfec=1",
            // Increase bitrate and enable stereo
            "minptime=10;useinbandfec=1;maxaveragebitrate=128000;stereo=1;sprop-stereo=1",
        );

        let stereo_answer = SessionDescription::parse(&sdp, answer.sdp_type())?;

        self.connection.set_local_description(stereo_answer).await?;

        let local_desc = self.connection.current_local_description();

        match local_desc {
            Some(d) => Ok(d),
            None => Err(anyhow::anyhow!("No local description found")),
        }
    }

    async fn add_candidate(&self, candidate: IceCandidate) -> Result<()> {
        self.connection.add_ice_candidate(candidate).await?;
        Ok(())
    }

    fn on_candidate(&self, tx: Sender<IceCandidate>) -> () {
        self.connection
            .on_ice_candidate(Some(Box::new(move |candidate| {
                let _ = tx.try_send(candidate);
            })))
    }

    async fn wait(&self) -> Result<()> {
        let notify = self.notify.clone();
        let (done_tx, mut done_rx) = tokio::sync::mpsc::channel::<()>(1);

        self.connection
            .on_connection_state_change(Some(Box::new(move |connection_state| {
                debug!("rtc connection state changed {:?}", connection_state);
                if connection_state == PeerConnectionState::Closed
                    || connection_state == PeerConnectionState::Disconnected
                    || connection_state == PeerConnectionState::Failed
                {
                    notify.notify_waiters();
                    let _ = done_tx.try_send(());
                }
            })));

        done_rx.recv().await;

        Ok(())
    }

    fn close(&self) -> () {
        debug!("closing rtc connection");
        self.notify.notify_waiters();
        self.connection.close();
    }
}

impl RTC {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let broadcast = Arc::clone(&&cx.argument::<JsBox<Arc<Broadcast>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let rtc = RTC::new(broadcast, rt);
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
        let signal = cx.argument::<JsString>(1)?.value(&mut cx);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let json = serde_json::from_str::<SessionDescriptionJson>(&signal)
                .expect("Unable to convert signal from JSON");
            let offer = SessionDescription::parse(&json.sdp, SdpType::Offer)
                .expect("Unable to parse signal");
            let answer = rtc.signal(offer).await;

            deferred.settle_with(&channel, move |mut cx| match answer {
                Ok(a) => Ok(cx.string(
                    serde_json::to_string(&SessionDescriptionJson {
                        t: a.sdp_type().to_string(),
                        sdp: a.to_string(),
                    })
                    .expect("Unable to convert answer to JSON"),
                )),
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
            let json = serde_json::from_str::<IceCandidateJson>(&candidate_str)
                .expect("Unable to convert candidate from JSON");
            let candidate =
                IceCandidate::parse(&json.sdp_mid, json.sdp_m_line_index, &json.candidate)
                    .expect("Unable to parse ice candidate");
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
                    let json = serde_json::to_string(&IceCandidateJson {
                        sdp_mid: candidate.sdp_mid(),
                        sdp_m_line_index: candidate.sdp_mline_index(),
                        candidate: candidate.candidate(),
                    })
                    .expect("Unable to convert ice candidate to json");

                    let args = vec![cx.string(json).upcast()];
                    callback.call(&mut cx, this, args)?;

                    Ok(())
                });
            }
        });

        Ok(cx.undefined())
    }

    pub fn js_wait(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let rec = rtc.wait().await;
            deferred.settle_with(&channel, move |mut cx| match rec {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_close(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(0)?);
        rtc.close();
        Ok(cx.undefined())
    }
}
