use std::sync::Arc;

use anyhow::Result;
use neon::{
    prelude::{Context, FunctionContext},
    result::JsResult,
    types::{Finalize, JsBox, JsNumber, JsPromise, JsUndefined},
};
use tokio::{net::UdpSocket, runtime::Runtime, sync::Notify};

use crate::{broadcast::Broadcast, constants::runtime, udp_broadcast};

pub struct Stream {
    pub udp_socket: Arc<UdpSocket>,
    notify: Arc<Notify>,
}

impl Finalize for Stream {
    fn finalize<'a, C: neon::prelude::Context<'a>>(self, _: &mut C) {
        self.notify.notify_waiters();
    }
}

impl Stream {
    async fn new(broadcast: Arc<Broadcast>, rt: &Runtime) -> Result<Arc<Self>> {
        let udp = UdpSocket::bind("127.0.0.1:0").await?;

        let udp_arc = Arc::new(udp);
        let notify = Arc::new(Notify::new());

        rt.spawn(udp_broadcast::runner(
            broadcast,
            Arc::clone(&udp_arc),
            Arc::clone(&notify),
        ));

        Ok(Arc::new(Self {
            udp_socket: Arc::clone(&udp_arc),
            notify: Arc::clone(&notify),
        }))
    }

    fn get_port(&self) -> Result<u16> {
        let addr = self.udp_socket.local_addr()?;
        Ok(addr.port())
    }

    fn stop(&self) -> () {
        self.notify.notify_waiters();
    }
}

impl Stream {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let broadcast = Arc::clone(&&cx.argument::<JsBox<Arc<Broadcast>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let stream = Stream::new(broadcast, rt).await;
            deferred.settle_with(&channel, move |mut cx| match stream {
                Ok(r) => Ok(cx.boxed(r)),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_get_port(mut cx: FunctionContext) -> JsResult<JsNumber> {
        let stream = Arc::clone(&&cx.argument::<JsBox<Arc<Stream>>>(0)?);

        match stream.get_port() {
            Ok(port) => Ok(cx.number(port as f64)),
            Err(e) => cx.throw_error(e.to_string()),
        }
    }

    pub fn js_stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let stream = Arc::clone(&&cx.argument::<JsBox<Arc<Stream>>>(0)?);

        stream.stop();

        Ok(cx.undefined())
    }
}
