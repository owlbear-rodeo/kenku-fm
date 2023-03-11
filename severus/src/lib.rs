use neon::prelude::*;

mod discord;
mod rtc;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("discordNew", discord::Discord::js_new)?;
    cx.export_function("discordGetInfo", discord::Discord::js_get_info)?;
    cx.export_function("discordJoin", discord::Discord::js_join)?;
    cx.export_function("discordLeave", discord::Discord::js_leave)?;
    cx.export_function("discordDestroy", discord::Discord::js_destroy)?;
    cx.export_function("rtcNew", rtc::RTC::js_new)?;
    cx.export_function("rtcSignal", rtc::RTC::js_signal)?;
    cx.export_function("rtcStartRecorder", rtc::RTC::js_start_recorder)?;
    cx.export_function("rtcClose", rtc::RTC::js_close)?;
    Ok(())
}
