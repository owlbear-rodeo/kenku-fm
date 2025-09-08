import { Snowflake } from "./Snowflake";

/**
 * @link https://discord.com/developers/docs/resources/channel#channel-object-channel-types
 */
export enum ChannelType {
  /** a text channel within a server */
  GuildText = 0,
  /** a direct message between users */
  DM = 1,
  /** a voice channel within a server */
  GuildVoice = 2,
  /** a direct message between multiple users */
  GroupDM = 3,
  /** an organizational category that contains up to 50 channels */
  GuildCategory = 4,
  /** a channel that users can follow and crosspost into their own server (formerly news channels) */
  GuildAnnouncement = 5,
  /** a temporary sub-channel within a GUILD_ANNOUNCEMENT channel */
  AnnouncementThread = 10,
  /** a temporary sub-channel within a GUILD_TEXT or GUILD_FORUM channel */
  PublicThread = 11,
  /** a temporary sub-channel within a GUILD_TEXT channel that is only viewable by those invited and those with the MANAGE_THREADS permission */
  PrivateThread = 12,
  /** a voice channel for hosting events with an audience */
  GuildStageVoice = 13,
  /** the channel in a hub containing the listed servers */
  GuildDirectory = 14,
  /** Channel that can only contain threads */
  GuildForum = 15,
}

export enum OverwriteType {
  Role = 0,
  Member = 1,
}

/**
 * @link https://discord.com/developers/docs/resources/channel#overwrite-object
 */
export interface Overwrite {
  /** role or user id */
  id: Snowflake;
  /** either 0 (role) or 1 (member) */
  type: OverwriteType;
  /** permission bit set */
  allow: string;
  /** permission bit set */
  deny: string;
}

/**
 * Subset of the Discord Channel object
 * @link https://discord.com/developers/docs/resources/channel#channel-object
 */
export interface Channel {
  /** the id of this channel */
  id: Snowflake;
  /** the type of channel */
  type: ChannelType;
  /** the id of the guild (may be missing for some channel objects received over gateway guild dispatches) */
  guild_id?: Snowflake;
  /** sorting position of the channel */
  position?: number;
  /** the name of the channel (1-100 characters) */
  name?: string | null;
  /** the bitrate (in bits) of the voice channel */
  bitrate?: number;
  /** computed permissions for the invoking user in the channel, including overwrites, only included when part of the resolved data received on a slash command interaction */
  permission_overwrites?: Overwrite[];
}
