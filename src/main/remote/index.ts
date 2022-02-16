import { PlayerManager } from "../managers/PlayerManager";
import { play as playlistPlay } from "./routes/playlist/play";
import { playback as playlistPlayback } from "./routes/playlist/playback";

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
  manager.fastify.register(playlistPlay(manager), {
    prefix: "/v1/playlist/play",
  });
  manager.fastify.register(playlistPlayback(manager), {
    prefix: "/v1/playlist/playback",
  });
}
