use discortp::rtp::RtpType;
use neon::prelude::Context;
use neon::result::NeonResult;
use once_cell::sync::OnceCell;
use tokio::runtime::Runtime;

/// Maximum packet size for a voice packet.
///
/// Set a safe amount below the Ethernet MTU to avoid fragmentation/rejection.
pub const VOICE_PACKET_MAX: usize = 1460;

/// The one (and only) RTP version.
pub const RTP_VERSION: u8 = 2;

/// Profile type used by Discord's Opus audio traffic.
pub const RTP_PROFILE_TYPE: RtpType = RtpType::Dynamic(120);

pub static RUNTIME: OnceCell<Runtime> = OnceCell::new();

pub fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}
