use audiopus::{Bitrate, SampleRate};
use discortp::rtp::RtpType;
use neon::prelude::Context;
use neon::result::NeonResult;
use once_cell::sync::OnceCell;
use tokio::runtime::Runtime;

/// Maximum packet size for a voice packet.
///
/// Set a safe amount below the Ethernet MTU to avoid fragmentation/rejection.
pub const VOICE_PACKET_MAX: usize = 1460;

/// Sample rate of audio to be sent to Discord.
pub const SAMPLE_RATE: SampleRate = SampleRate::Hz48000;

/// Sample rate of audio to be sent to Discord.
pub const SAMPLE_RATE_RAW: usize = 48_000;

/// Number of audio frames/packets to be sent per second.
pub const AUDIO_FRAME_RATE: usize = 50;

/// Default bitrate for audio.
pub const DEFAULT_BITRATE: Bitrate = Bitrate::BitsPerSecond(128_000);

/// Number of samples in one complete frame of audio per channel.
///
/// This is equally the number of stereo (joint) samples in an audio frame.
pub const MONO_FRAME_SIZE: usize = SAMPLE_RATE_RAW / AUDIO_FRAME_RATE;

/// Number of individual samples in one complete frame of stereo audio.
pub const STEREO_FRAME_SIZE: usize = 2 * MONO_FRAME_SIZE;

/// The one (and only) RTP version.
pub const RTP_VERSION: u8 = 2;

/// Profile type used by Discord's Opus audio traffic.
pub const RTP_PROFILE_TYPE: RtpType = RtpType::Dynamic(120);

pub static RUNTIME: OnceCell<Runtime> = OnceCell::new();

pub fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}
