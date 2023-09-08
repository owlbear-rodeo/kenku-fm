import { Channel, OverwriteType } from "../types/Channel";
import { BaseGuild } from "../types/Guild";
import { GuildMember } from "../types/GuildMember";
import { Permission } from "./Permission";

/**
 * Permission value for a channel overwrite
 */
enum Value {
  Unset,
  Allow,
  Deny,
}

/**
 * Check a guild members permission taking into account
 * base permissions and channel overwrites
 */
export function hasPermission(
  member: GuildMember,
  guild: BaseGuild,
  channel: Channel,
  permission: Permission
) {
  const guildPermission = hasGuildPermission(guild, permission);
  const channelPermission = hasChannelPermission(member, channel, permission);

  if (channelPermission === Value.Unset) {
    return guildPermission === Value.Allow;
  } else {
    return channelPermission === Value.Allow;
  }
}

function hasGuildPermission(guild: BaseGuild, permission: Permission): Value {
  if (guild.permissions) {
    if (checkPermission(guild.permissions, permission)) {
      return Value.Allow;
    } else {
      return Value.Deny;
    }
  }
  return Value.Unset;
}

function hasChannelPermission(
  member: GuildMember,
  channel: Channel,
  permission: Permission
): Value {
  let denied = false;
  if (channel.permission_overwrites) {
    for (const overwrite of channel.permission_overwrites) {
      if (overwrite.type === OverwriteType.Role) {
        // When the ID === the guild ID it targets the @everyone roll
        if (overwrite.id === channel.guild_id) {
          if (checkPermission(overwrite.allow, permission)) {
            return Value.Allow;
          }
          if (checkPermission(overwrite.deny, permission)) {
            denied = true;
          }
        } else if (member.roles.includes(overwrite.id)) {
          if (checkPermission(overwrite.allow, permission)) {
            return Value.Allow;
          }
          if (checkPermission(overwrite.deny, permission)) {
            denied = true;
          }
        }
      } else if (overwrite.type === OverwriteType.Member) {
        if (overwrite.id === member.user.id) {
          if (checkPermission(overwrite.allow, permission)) {
            return Value.Allow;
          }
          if (checkPermission(overwrite.deny, permission)) {
            denied = true;
          }
        }
      }
    }
  }
  return denied ? Value.Deny : Value.Unset;
}

/**
 * Check an incoming bitmask with a user permission
 */
function checkPermission(incoming: string, permission: Permission) {
  const p = BigInt(permission);
  return (BigInt(incoming) & p) === p;
}
