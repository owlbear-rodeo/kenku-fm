import { ipcMain } from "electron";

import { FastifyPluginCallback } from "fastify";

import { PlayerManager } from "../../../managers/PlayerManager";
import { VIEW_ERROR } from "../../";
import { SoundboardPlaybackReply } from "../../../../types/player";

async function waitForPlaybackReply(): Promise<SoundboardPlaybackReply> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Request timeout");
    }, 5000);
    ipcMain.once(
      "PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REPLY",
      (_: Electron.IpcMainEvent, playback: SoundboardPlaybackReply) => {
        clearTimeout(timeout);
        resolve(playback);
      }
    );
  });
}

export const playback: (manager: PlayerManager) => FastifyPluginCallback =
  (manager) => (fastify, _, done) => {
    fastify.get("/", async (_, reply) => {
      const view = manager.getView();
      if (view) {
        view.send("PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST");
        try {
          const playback = await waitForPlaybackReply();
          reply.status(200).send(playback);
        } catch {
          reply.status(408).send({
            statusCode: 408,
            error: "Request Timeout",
            message: "Unable to retrieve playback in a reasonable time",
          });
        }
      } else {
        reply.status(503).send(VIEW_ERROR);
      }
    });

    done();
  };
