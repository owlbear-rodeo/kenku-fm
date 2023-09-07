use std::sync::Arc;

use log::{Log, Metadata, Record};
use neon::prelude::{Context, FunctionContext, Object};
use neon::result::JsResult;
use neon::types::{Finalize, JsFunction, JsString, JsUndefined};

use once_cell::sync::OnceCell;
use tokio::sync::watch::{self, Receiver, Sender};

use crate::constants::runtime;

#[derive(Debug, Clone)]
struct Message {
    level: String,
    value: String,
}

struct Messages {
    tx: Sender<Message>,
    rx: Receiver<Message>,
}

static MESSAGES: OnceCell<Messages> = OnceCell::new();

fn messages() -> &'static Messages {
    MESSAGES.get_or_init(|| {
        let (tx, rx) = watch::channel(Message {
            level: String::from("info"),
            value: String::from("new electron log"),
        });
        Messages { tx, rx }
    })
}

pub struct Logger;

static LOGGER: Logger = Logger;

impl Finalize for Logger {}

impl Log for Logger {
    fn log(&self, record: &Record) {
        let message = Message {
            level: record.level().to_string(),
            value: record.args().to_string(),
        };
        messages().tx.send(message).unwrap()
    }

    fn flush(&self) {}

    fn enabled(&self, _: &Metadata) -> bool {
        true
    }
}

impl Logger {
    pub fn js_init(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        log::set_logger(&LOGGER).unwrap();

        Ok(cx.undefined())
    }

    pub fn js_set_log_level(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let level = cx.argument::<JsString>(0)?.value(&mut cx);

        match level.as_str() {
            "info" => log::set_max_level(log::LevelFilter::Info),
            "debug" => log::set_max_level(log::LevelFilter::Debug),
            "warn" => log::set_max_level(log::LevelFilter::Warn),
            "error" => log::set_max_level(log::LevelFilter::Error),
            "trace" => log::set_max_level(log::LevelFilter::Trace),
            _ => log::error!("Unable to set log level: unsupported"),
        }

        Ok(cx.undefined())
    }

    pub fn js_on_log(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let rt = runtime(&mut cx)?;
        let log_cb = Arc::new(cx.argument::<JsFunction>(0)?.root(&mut cx));
        let channel = cx.channel();

        let mut rx = messages().rx.clone();

        rt.spawn(async move {
            while let Ok(_) = rx.changed().await {
                let message = rx.borrow().clone();
                let log_cb = Arc::clone(&log_cb);
                channel.send(move |mut cx| {
                    let callback = log_cb.to_inner(&mut cx);
                    let this = cx.undefined();
                    let args = vec![
                        cx.string(message.level).upcast(),
                        cx.string(message.value).upcast(),
                    ];
                    callback.call(&mut cx, this, args)?;

                    Ok(())
                });
            }
        });

        Ok(cx.undefined())
    }
}
