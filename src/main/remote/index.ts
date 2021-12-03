import { PlayerManager } from "../managers/PlayerManager";
import { play } from "./routes/play";
import { playback } from "./routes/playback";

export type ReplyError = {
  statusCode: number;
  error: string;
  message: string;
};

export const VIEW_ERROR: ReplyError = {
  statusCode: 503,
  error: "Service Unavailable",
  message: "Unable to connect to Kenku FM",
};

export function registerRemote(manager: PlayerManager) {
  manager.fastify.register(play(manager), { prefix: "/v1/play" });
  manager.fastify.register(playback(manager), { prefix: "/v1/playback" });
}
