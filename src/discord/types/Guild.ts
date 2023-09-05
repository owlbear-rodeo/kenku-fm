import { Channel } from "./Channel";
import { Snowflake } from "./Snowflake";

/**
 * @link https://discord.com/developers/docs/resources/guild#unavailable-guild-object
 */
export interface UnavailableGuild {
  id: string;
  unavailable: true;
}

/**
 * Subset of the Discord Guild object
 * @link https://discord.com/developers/docs/resources/guild#guild-object
 */
export interface BaseGuild {
  /** guild id */
  id: Snowflake;
  /** guild name (2-100 characters, excluding trailing and leading whitespace) */
  name: string;
  /** icon hash */
  icon: string | null;
}

/**
 * Subset of the Discord Guild object from the `CreateGuild` event
 * @link https://discord.com/developers/docs/topics/gateway-events#guild-create
 */
export interface FullGuild extends BaseGuild {
  /** Channels in the guild */
  channels: Channel[];
  /** true if this guild is unavailable due to an outage */
  unavailable?: boolean;
}

export type Guild = UnavailableGuild | BaseGuild | FullGuild;
