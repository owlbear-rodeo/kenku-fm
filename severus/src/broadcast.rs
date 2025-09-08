use dashmap::DashMap;
use flume::Sender;
use log::{debug, error};
use neon::{
    prelude::{Context, FunctionContext},
    result::JsResult,
    types::{Finalize, JsBox},
};
use rand::Rng;
use rtp::packet::Packet;
use std::sync::Arc;

pub struct Broadcast {
    senders: DashMap<u32, Sender<Packet>>,
}

impl Finalize for Broadcast {}

impl Broadcast {
    fn new() -> Arc<Self> {
        debug!("new broadcast created");

        Arc::new(Self {
            senders: Default::default(),
        })
    }

    pub fn send(&self, packet: Packet) -> () {
        for item in self.senders.iter() {
            if let Err(e) = item.value().send(packet.clone()) {
                error!("broadcast packet send error: {:?}.", e);
            }
        }
    }

    pub fn register(&self, tx: Sender<Packet>) -> u32 {
        let mut rng = rand::thread_rng();
        let key = rng.gen::<u32>();
        self.senders.insert(key, tx);

        debug!("register broadcast {}", key);

        key
    }

    pub fn unregister(&self, key: u32) -> () {
        debug!("unregister broadcast {}", key);

        self.senders.remove(&key);
    }
}

impl Broadcast {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsBox<Arc<Broadcast>>> {
        let broadcast = Broadcast::new();

        Ok(cx.boxed(broadcast))
    }
}
