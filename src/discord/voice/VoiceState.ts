import { Snowflake } from "../types/Snowflake";

/**
 * Subset of the Discord VoiceState object
 * @link https://discord.com/developers/docs/resources/voice#voice-state-object
 */
export interface VoiceState {
  /** the guild id this voice state is for */
  guild_id?: Snowflake;
  /** the channel id this user is connected to */
  channel_id: Snowflake | null;
  /** the user id this voice state is for */
  user_id: Snowflake;
  /** the session id for this voice state */
  session_id: string;
}
