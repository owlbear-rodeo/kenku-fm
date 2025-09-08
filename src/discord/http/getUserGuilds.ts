import { BaseGuild } from "../types/Guild";
import { get } from "./get";

/**
 * https://discord.com/developers/docs/resources/user#get-current-user-guilds
 */
export function getUserGuilds(token: string) {
  return get<BaseGuild[]>(token, "/users/@me/guilds");
}
