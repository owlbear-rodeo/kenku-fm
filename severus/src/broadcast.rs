use bus::{Bus, BusReader};
use log::debug;
use neon::{
    prelude::{Context, FunctionContext},
    result::JsResult,
    types::{Finalize, JsBox},
};
use rtp::packet::Packet;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct OpusEvents {
    bus: Bus<Packet>,
}

impl OpusEvents {
    pub fn new() -> Self {
        OpusEvents { bus: Bus::new(10) }
    }

    pub fn notify(&mut self, packet: Packet) -> () {
        self.bus.broadcast(packet);
    }

    pub fn get_receiver(&mut self) -> BusReader<Packet> {
        self.bus.add_rx()
    }
}

pub struct Broadcast {
    pub events: Arc<Mutex<OpusEvents>>,
}

impl Finalize for Broadcast {}

impl Broadcast {
    fn new() -> Arc<Self> {
        let events = Arc::new(Mutex::new(OpusEvents::new()));

        debug!("new broadcast created");

        Arc::new(Self { events })
    }
}

impl Broadcast {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsBox<Arc<Broadcast>>> {
        let broadcast = Broadcast::new();

        Ok(cx.boxed(broadcast))
    }
}
