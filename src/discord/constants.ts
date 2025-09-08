import { DiscordVoiceEncryptionMode } from "./voice/VoiceGatewayEvent";

export const API_VERSION = "10";
export const API_URL = `https://discord.com/api/v${API_VERSION}`;
export const VOICE_API_VERSION = "7";
/** We only need the GUILDS and GUILD_VOICE_STATES intents so hard code it */
export const INTENTS = (1 << 0) | (1 << 7);
export const CDN_URL = "https://cdn.discordapp.com";
export const SUPPORTED_AUDIO_ENCRYPTION: DiscordVoiceEncryptionMode[] = ["aead_xchacha20_poly1305_rtpsize", "aead_aes256_gcm_rtpsize"];
export const PREFERRED_AUDIO_ENCRYPTION: DiscordVoiceEncryptionMode = "aead_aes256_gcm_rtpsize";
export const FALLBACK_AUDIO_ENCRYPTION: DiscordVoiceEncryptionMode = "aead_xchacha20_poly1305_rtpsize";