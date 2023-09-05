use discortp::rtp::RtpType;

/// Maximum packet size for a voice packet.
///
/// Set a safe amount below the Ethernet MTU to avoid fragmentation/rejection.
pub const VOICE_PACKET_MAX: usize = 1460;

/// The one (and only) RTP version.
pub const RTP_VERSION: u8 = 2;

/// Profile type used by Discord's Opus audio traffic.
pub const RTP_PROFILE_TYPE: RtpType = RtpType::Dynamic(120);
