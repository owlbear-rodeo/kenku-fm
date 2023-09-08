import { Channel } from "../types/Channel";
import { get } from "./get";

/**
 * @link https://discord.com/developers/docs/resources/guild#get-guild-channels
 */
export function getGuildChannels(token: string, guildId: string) {
  return get<Channel[]>(token, `/guilds/${guildId}/channels`);
}
