import { API_URL } from "../constants";
import { DiscordError } from "../types/DiscordError";
import { GatewayDescription } from "./GatewayDescription";

export async function getGatewayDescription(
  token: string
): Promise<
  | { data: GatewayDescription; error: null }
  | { data: null; error: DiscordError }
> {
  const response = await fetch(`${API_URL}/gateway/bot`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": `DiscordBot (https://kenku.fm, v1.0)`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    return { data: null, error: data };
  } else {
    return { data, error: null };
  }
}
