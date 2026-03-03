use neon::prelude::*;

mod broadcast;
mod constants;
mod dave;
mod electron_log;
mod encrypt;
mod error;
mod rtc;
mod rtc_broadcast;
mod rtc_udp;
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
        "voiceConnectionSetDaveSession",
        voice_connection::VoiceConnection::js_set_dave_session,
    )?;
    cx.export_function(
        "voiceConnectionDisconnect",
        voice_connection::VoiceConnection::js_disconnect,
    )?;
    cx.export_function("daveSessionNew", dave::DaveSession::js_new)?;
    cx.export_function("daveSessionReinit", dave::DaveSession::js_reinit)?;
    cx.export_function("daveSessionReset", dave::DaveSession::js_reset)?;
    cx.export_function(
        "daveSessionSetExternalSender",
        dave::DaveSession::js_set_external_sender,
    )?;
    cx.export_function(
        "daveSessionGetKeyPackage",
        dave::DaveSession::js_get_key_package,
    )?;
    cx.export_function(
        "daveSessionProcessProposals",
        dave::DaveSession::js_process_proposals,
    )?;
    cx.export_function(
        "daveSessionProcessCommit",
        dave::DaveSession::js_process_commit,
    )?;
    cx.export_function(
        "daveSessionProcessWelcome",
        dave::DaveSession::js_process_welcome,
    )?;
    cx.export_function(
        "daveSessionSetPassthroughMode",
        dave::DaveSession::js_set_passthrough_mode,
    )?;
    cx.export_function(
        "daveSessionCanPassthrough",
        dave::DaveSession::js_can_passthrough,
    )?;
    cx.export_function("rtcNew", rtc::RTC::js_new)?;
    cx.export_function("rtcSignal", rtc::RTC::js_signal)?;
    cx.export_function("rtcAddCandidate", rtc::RTC::js_add_candidate)?;
    cx.export_function("rtcOnCandidate", rtc::RTC::js_on_candidate)?;
    cx.export_function("rtcOnClose", rtc::RTC::js_on_close)?;
    cx.export_function("rtcClose", rtc::RTC::js_close)?;
    cx.export_function("logInit", electron_log::Logger::js_init)?;
    cx.export_function("logSetLogLevel", electron_log::Logger::js_set_log_level)?;
    cx.export_function("logOnLog", electron_log::Logger::js_on_log)?;
    cx.export_function("broadcastNew", broadcast::Broadcast::js_new)?;
    Ok(())
}
