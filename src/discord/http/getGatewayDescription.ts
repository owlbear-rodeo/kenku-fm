import { GatewayDescription } from "../gateway/GatewayDescription";
import { get } from "./get";

/**
 * @link https://discord.com/developers/docs/topics/gateway#get-gateway-bot
 */
export function getGatewayDescription(token: string) {
  return get<GatewayDescription>(token, "/gateway/bot");
}
