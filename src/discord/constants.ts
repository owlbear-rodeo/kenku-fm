export const API_VERSION = "10";
export const API_URL = `https://discord.com/api/v${API_VERSION}`;
export const VOICE_API_VERSION = "7";
/** We only need the GUILDS and GUILD_VOICE_STATES intents so hard code it */
export const INTENTS = (1 << 0) | (1 << 7);
export const CDN_URL = "https://cdn.discordapp.com";
