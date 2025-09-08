import { GuildMember } from "../types/GuildMember";
import { get } from "./get";

/**
 * @link https://discord.com/developers/docs/resources/guild#get-guild-member
 */
export function getGuildMember(token: string, guildId: string, userId: string) {
  return get<GuildMember>(token, `/guilds/${guildId}/members/${userId}`);
}
