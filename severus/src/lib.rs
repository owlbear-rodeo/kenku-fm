use neon::prelude::*;

mod discord;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("discordNew", discord::Discord::js_new)?;
    cx.export_function("discordGetInfo", discord::Discord::js_get_info)?;
    Ok(())
}
