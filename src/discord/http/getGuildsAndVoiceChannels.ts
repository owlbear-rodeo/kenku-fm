import { CDN_URL } from "../constants";
import { BaseGuild } from "../types/Guild";
import { hasPermission } from "../permissions/hasPermission";
import { getUserGuilds } from "./getUserGuilds";
import { getGuildMember } from "./getGuildMember";
import { getGuildChannels } from "./getGuildChannels";
import { Permission } from "../permissions/Permission";

/** Simplified voice channel to just the data Kenku needs */
interface VoiceChannel {
  id: string;
  name: string;
  position: number;
}

/** Simplified guild to just the data Kenku needs */
interface VoiceGuild {
  id: string;
  name: string;
  icon: string;
  voiceChannels: VoiceChannel[];
}

/**
 * Get the guilds and their voice channels that this bot has permissions to connect to
 */
export async function getGuildsAndVoiceChannels(
  token: string,
  userId: string
): Promise<VoiceGuild[]> {
  const { data: baseGuilds, error } = await getUserGuilds(token);

  if (error) {
    throw error;
  }

  return Promise.all(
    baseGuilds.map((guild) => expandBaseGuild(token, userId, guild))
  );
}

/**
 * Get all the voice channels for a guild the user has permission to
 */
async function expandBaseGuild(
  token: string,
  userId: string,
  baseGuild: BaseGuild
): Promise<VoiceGuild> {
  const { data: member, error: guildMemberError } = await getGuildMember(
    token,
    baseGuild.id,
    userId
  );

  if (guildMemberError) {
    throw guildMemberError;
  }

  const { data: channels, error: guildChannelError } = await getGuildChannels(
    token,
    baseGuild.id
  );

  if (guildChannelError) {
    throw guildChannelError;
  }

  const voiceChannels: VoiceChannel[] = [];
  for (const channel of channels) {
    const isVoiceChannel = Boolean(channel.bitrate);
    if (isVoiceChannel) {
      if (
        hasPermission(member, baseGuild, channel, Permission.ViewChannel) &&
        hasPermission(member, baseGuild, channel, Permission.Connect) &&
        hasPermission(member, baseGuild, channel, Permission.Speak)
      ) {
        voiceChannels.push({
          id: channel.id,
          name: channel.name,
          position: channel.position,
        });
      }
    }
  }

  return {
    id: baseGuild.id,
    // Transform icon to a valid URL
    icon: `${CDN_URL}/icons/${baseGuild.id}/${baseGuild.icon}.webp`,
    name: baseGuild.name,
    // Sort voice channels base off of their position
    voiceChannels: voiceChannels.sort((a, b) => a.position - b.position),
  };
}
