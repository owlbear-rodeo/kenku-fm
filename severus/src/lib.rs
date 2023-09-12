use neon::prelude::*;

mod broadcast;
mod constants;
mod electron_log;
mod encrypt;
mod error;
mod stream;
mod udp_broadcast;
mod udp_discord;
mod voice_connection;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function(
        "voiceConnectionNew",
        voice_connection::VoiceConnection::js_new,
    )?;
    cx.export_function(
        "voiceConnectionDiscoverIp",
        voice_connection::VoiceConnection::js_discover_ip,
    )?;
    cx.export_function(
        "voiceConnectionConnect",
        voice_connection::VoiceConnection::js_connect,
    )?;
    cx.export_function(
        "voiceConnectionDisconnect",
        voice_connection::VoiceConnection::js_disconnect,
    )?;
    cx.export_function("streamNew", stream::Stream::js_new)?;
    cx.export_function("streamGetPort", stream::Stream::js_get_port)?;
    cx.export_function("streamStop", stream::Stream::js_stop)?;
    cx.export_function("logInit", electron_log::Logger::js_init)?;
    cx.export_function("logSetLogLevel", electron_log::Logger::js_set_log_level)?;
    cx.export_function("logOnLog", electron_log::Logger::js_on_log)?;
    cx.export_function("broadcastNew", broadcast::Broadcast::js_new)?;
    Ok(())
}
