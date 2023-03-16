use anyhow::Result;
use futures::StreamExt;
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
use songbird::CoreEvent;
use std::sync::Arc;
use tokio::runtime::Runtime;
use twilight_gateway::Cluster;
use twilight_gateway::Intents;
use twilight_http::Client;
use twilight_model::channel::ChannelType;
use twilight_model::id::marker::ChannelMarker;
use twilight_model::id::marker::GuildMarker;
use twilight_model::id::Id;

use songbird::Songbird;

use crate::rtc::RTC;
use crate::sender;
use crate::sender::DriverEvents;

static RUNTIME: OnceCell<Runtime> = OnceCell::new();

fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}

struct Voice {
    id: Id<ChannelMarker>,
    name: String,
}
struct Guild {
    id: Id<GuildMarker>,
    name: String,
    icon: String,
    voice_channels: Vec<Voice>,
}

pub struct Discord {
    client: Client,
    cluster: Arc<Cluster>,
    voice: Songbird,
}

impl Finalize for Discord {}

impl Discord {
    async fn new(token: &str, rt: &Runtime) -> Result<Arc<Self>> {
        let (mut events, discord) = {
            let token = String::from(token);
            let client = Client::new(token.clone());

            let intents = Intents::GUILDS | Intents::GUILD_VOICE_STATES;
            let (cluster, events) = Cluster::new(String::from(token), intents).await?;

            cluster.up().await;

            let cluster_arc = Arc::new(cluster);

            let cluster_spawn = Arc::clone(&cluster_arc);

            let user_id = client.current_user().exec().await?.model().await?.id;

            let voice = Songbird::twilight(cluster_arc, user_id);
            (
                events,
                Arc::new(Discord {
                    client,
                    voice,
                    cluster: cluster_spawn,
                }),
            )
        };

        let d2 = Arc::clone(&discord);
        rt.spawn(async move {
            while let Some((_, event)) = events.next().await {
                d2.voice.process(&event).await;
            }
        });

        Ok(discord)
    }

    async fn get_info(&self) -> Result<Vec<Guild>> {
        let mut guilds_vec: Vec<Guild> = Vec::new();
        let http = &self.client;

        let guilds = http.current_user_guilds().exec().await?.model().await?;

        for (_, guild) in guilds.iter().enumerate() {
            if let Ok(channels) = http.guild_channels(guild.id).exec().await?.model().await {
                let mut voice_channels = vec![];
                for (_, channel) in channels.iter().enumerate() {
                    match channel.kind == ChannelType::GuildVoice {
                        true => {
                            let chan = Voice {
                                id: channel.id,
                                name: match &channel.name {
                                    Some(n) => n.to_string(),
                                    None => String::new(),
                                },
                            };
                            voice_channels.push(chan)
                        }
                        false => {}
                    }
                }
                let new_guild = Guild {
                    id: guild.id,
                    name: guild.name.to_string(),
                    icon: match guild.icon {
                        Some(i) => i.to_string(),
                        None => String::new(),
                    },
                    voice_channels,
                };

                guilds_vec.push(new_guild);
            }
        }

        Ok(guilds_vec)
    }

    async fn join(
        &self,
        rtc: Arc<RTC>,
        guild_id: Id<GuildMarker>,
        channel_id: Id<ChannelMarker>,
    ) -> Result<()> {
        let handler = self.voice.get_or_insert(guild_id);
        let mut handler_lock = handler.lock().await;
        handler_lock.disable_mixer(true);
        let events = Arc::clone(&rtc.events);
        let (driver_tx, driver_rx) = flume::unbounded();
        handler_lock.add_global_event(
            songbird::Event::Core(CoreEvent::DriverConnect),
            DriverEvents::new(driver_tx.clone()),
        );
        handler_lock.add_global_event(
            songbird::Event::Core(CoreEvent::DriverReconnect),
            DriverEvents::new(driver_tx.clone()),
        );
        handler_lock.add_global_event(
            songbird::Event::Core(CoreEvent::DriverDisconnect),
            DriverEvents::new(driver_tx.clone()),
        );
        drop(handler_lock);
        sender::runner(events.rx.clone(), driver_rx);
        let _ = self.voice.join(guild_id, channel_id).await;
        Ok(())
    }

    async fn leave(&self, guild_id: Id<GuildMarker>) -> Result<()> {
        self.voice.remove(guild_id).await?;
        Ok(())
    }

    fn destroy(&self) {
        self.cluster.down();
    }
}

impl Discord {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let token = cx.argument::<JsString>(0)?.value(&mut cx);

        let rt = runtime(&mut cx)?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let discord = Discord::new(&token, rt).await;
            deferred.settle_with(&channel, move |mut cx| match discord {
                Ok(d) => Ok(cx.boxed(d)),
                Err(e) => cx.throw_error(e.to_string()),
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

            deferred.settle_with(&channel, move |mut cx| match guilds {
                Ok(g) => {
                    let arr = JsArray::new(&mut cx, g.len() as u32);

                    for (index, guild) in g.iter().enumerate() {
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
                }
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_join(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let discord = Arc::clone(&&cx.argument::<JsBox<Arc<Discord>>>(0)?);
        let rtc = Arc::clone(&&cx.argument::<JsBox<Arc<RTC>>>(1)?);
        let guild_id = cx.argument::<JsString>(2)?.value(&mut cx);
        let channel_id = cx.argument::<JsString>(3)?.value(&mut cx);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let join = discord
                .join(
                    rtc,
                    Id::new(guild_id.parse::<u64>().unwrap()),
                    Id::new(channel_id.parse::<u64>().unwrap()),
                )
                .await;

            deferred.settle_with(&channel, move |mut cx| match join {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_leave(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let discord = Arc::clone(&&cx.argument::<JsBox<Arc<Discord>>>(0)?);
        let guild_id = cx.argument::<JsString>(1)?.value(&mut cx);

        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let leave = discord
                .leave(Id::new(guild_id.parse::<u64>().unwrap()))
                .await;

            deferred.settle_with(&channel, move |mut cx| match leave {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(e.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_destroy(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let discord = Arc::clone(&&cx.argument::<JsBox<Arc<Discord>>>(0)?);

        discord.destroy();

        Ok(cx.undefined())
    }
}
