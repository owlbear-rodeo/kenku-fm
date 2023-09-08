import { API_URL } from "../constants";
import { DiscordError } from "../types/DiscordError";

export type DiscordResponse<T> =
  | { data: T; error: null }
  | { data: null; error: DiscordError };

export async function get<T>(
  token: string,
  path: string
): Promise<DiscordResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
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
