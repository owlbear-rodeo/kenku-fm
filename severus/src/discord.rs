use std::sync::Arc;

use neon::context::Context;
use neon::prelude::FunctionContext;
use neon::prelude::*;
use neon::result::JsResult;
use neon::result::NeonResult;
use neon::types::Finalize;
use neon::types::JsArray;
use neon::types::JsBox;
use neon::types::JsPromise;
use neon::types::JsString;
use once_cell::sync::OnceCell;
use serenity::model::prelude::ChannelType;
use serenity::model::prelude::GuildId;
use serenity::prelude::GatewayIntents;
use serenity::Client;
use tokio::runtime::Runtime;

static RUNTIME: OnceCell<Runtime> = OnceCell::new();

fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}

struct Voice {
    id: String,
    name: String,
}
struct Guild {
    id: GuildId,
    name: String,
    icon: String,
    voice_channels: Vec<Voice>,
}
pub struct Discord {
    client: Client,
}

impl Finalize for Discord {}

impl Discord {
    async fn new(token: &str) -> Arc<Self> {
        let intents = GatewayIntents::GUILDS;
        let client = Client::builder(&token, intents).await.expect("err");

        Arc::new(Self { client })
    }

    async fn get_info(&self) -> Vec<Guild> {
        let mut g: Vec<Guild> = Vec::new();
        let http = &self.client.cache_and_http.http;

        if let Ok(user) = http.get_current_user().await {
            if let Ok(guilds) = user.guilds(&http).await {
                for (_, guild) in guilds.iter().enumerate() {
                    if let Ok(channels) = http.get_channels(guild.id.0).await {
                        let mut voice_channels = vec![];
                        for (_, channel) in channels.iter().enumerate() {
                            match channel.kind == ChannelType::Voice {
                                true => {
                                    let chan = Voice {
                                        id: channel.id.to_string(),
                                        name: channel.name.to_string(),
                                    };
                                    voice_channels.push(chan)
                                }
                                false => {}
                            }
                        }
                        let a = Guild {
                            id: guild.id,
                            name: guild.name.to_string(),
                            icon: guild.icon_url().unwrap_or_else(|| "".to_string()),
                            voice_channels: voice_channels,
                        };

                        g.push(a);
                    }
                }
                return g;
            }
        }
        return Vec::new();
    }
}

impl Discord {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let token = cx.argument::<JsString>(0)?.value(&mut cx);

        let rt = runtime(&mut cx)?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let discord = Discord::new(&token).await;

            deferred.settle_with(&channel, move |mut cx| {
                // Code here executes blocking on the JavaScript main thread
                Ok(cx.boxed(discord))
            });
        });

        Ok(promise)
    }

    pub fn js_get_info(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let discord = Arc::clone(&&cx.argument::<JsBox<Arc<Discord>>>(0)?);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let guilds = discord.get_info().await;

            // Code here executes blocking on the JavaScript main thread
            deferred.settle_with(&channel, move |mut cx| {
                let arr = JsArray::new(&mut cx, guilds.len() as u32);

                for (index, guild) in guilds.iter().enumerate() {
                    let channels = JsArray::new(&mut cx, guild.voice_channels.len() as u32);

                    let obj = cx.empty_object();

                    let name = cx.string(&guild.name);
                    obj.set(&mut cx, "name", name)?;

                    let id = cx.string(&guild.id.to_string());
                    obj.set(&mut cx, "id", id)?;

                    let icon = cx.string(&guild.icon.to_string());
                    obj.set(&mut cx, "icon", icon)?;

                    for (index, channel) in guild.voice_channels.iter().enumerate() {
                        let channel_obj = cx.empty_object();

                        let channel_id = cx.string(&channel.id.to_string());
                        channel_obj.set(&mut cx, "id", channel_id)?;

                        let channel_name = cx.string(&channel.name.to_string());
                        channel_obj.set(&mut cx, "name", channel_name)?;

                        channels.set(&mut cx, index as u32, channel_obj)?;
                        obj.set(&mut cx, "voiceChannels", channels)?;
                    }

                    arr.set(&mut cx, index as u32, obj)?;
                }

                Ok(arr)
            });
        });

        Ok(promise)
    }
}
