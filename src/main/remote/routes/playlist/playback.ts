import { ipcMain } from "electron";

import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginCallback } from "fastify";

import { PlayerManager } from "../../../managers/PlayerManager";
import { ReplyError, VIEW_ERROR } from "../../";
import { PlaylistPlaybackReply } from "../../../../types/player";

const MuteRequest = Type.Object({
  mute: Type.Boolean(),
});
type MuteRequestType = Static<typeof MuteRequest>;

const VolumeRequest = Type.Object({
  volume: Type.Number(),
});
type VolumeRequestType = Static<typeof VolumeRequest>;

const RepeatRequest = Type.Object({
  repeat: Type.Union([
    Type.Literal("off"),
    Type.Literal("track"),
    Type.Literal("playlist"),
  ]),
});
type RepeatRequestType = Static<typeof RepeatRequest>;

const ShuffleRequest = Type.Object({
  shuffle: Type.Boolean(),
});
type ShuffleRequestType = Static<typeof ShuffleRequest>;

const SeekRequest = Type.Object({
  to: Type.Number(),
});
type SeekRequestType = Static<typeof SeekRequest>;

async function waitForPlaybackReply(): Promise<PlaylistPlaybackReply> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Request timeout");
    }, 5000);
    ipcMain.once(
      "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPLY",
      (_: Electron.IpcMainEvent, playback: PlaylistPlaybackReply) => {
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
        view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST");
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

    fastify.put("/play", (request, reply) => {
      const view = manager.getView();
      if (view) {
        view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY");
        reply.status(200).send(request.body);
      } else {
        reply.status(503).send(VIEW_ERROR);
      }
    });

    fastify.put("/pause", (request, reply) => {
      const view = manager.getView();
      if (view) {
        view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE");
        reply.status(200).send(request.body);
      } else {
        reply.status(503).send(VIEW_ERROR);
      }
    });

    fastify.put<{
      Body: MuteRequestType;
      Reply: MuteRequestType | ReplyError;
    }>(
      "/mute",
      {
        schema: {
          body: MuteRequest,
          response: {
            200: MuteRequest,
          },
        },
      },
      (request, reply) => {
        const view = manager.getView();
        if (view) {
          view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE", request.body.mute);
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    fastify.put<{
      Body: VolumeRequestType;
      Reply: VolumeRequestType | ReplyError;
    }>(
      "/volume",
      {
        schema: {
          body: VolumeRequest,
          response: {
            200: VolumeRequest,
          },
        },
      },

      (request, reply) => {
        const view = manager.getView();
        if (view) {
          view.send(
            "PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME",
            Math.max(Math.min(request.body.volume, 1), 0)
          );
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    fastify.put<{
      Body: SeekRequestType;
      Reply: SeekRequestType | ReplyError;
    }>(
      "/seek",
      {
        schema: {
          body: SeekRequest,
          response: {
            200: SeekRequest,
          },
        },
      },

      (request, reply) => {
        const view = manager.getView();
        if (view) {
          view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK", request.body.to);
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    fastify.post("/next", (request, reply) => {
      const view = manager.getView();
      if (view) {
        view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT");
        reply.status(200).send(request.body);
      } else {
        reply.status(503).send(VIEW_ERROR);
      }
    });

    fastify.post("/previous", (request, reply) => {
      const view = manager.getView();
      if (view) {
        view.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS");
        reply.status(200).send(request.body);
      } else {
        reply.status(503).send(VIEW_ERROR);
      }
    });

    fastify.put<{
      Body: RepeatRequestType;
      Reply: RepeatRequestType | ReplyError;
    }>(
      "/repeat",
      {
        schema: {
          body: RepeatRequest,
          response: {
            200: RepeatRequest,
          },
        },
      },
      (request, reply) => {
        const view = manager.getView();
        if (view) {
          view.send(
            "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT",
            request.body.repeat
          );
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    fastify.put<{
      Body: ShuffleRequestType;
      Reply: ShuffleRequestType | ReplyError;
    }>(
      "/shuffle",
      {
        schema: {
          body: ShuffleRequest,
          response: {
            200: ShuffleRequest,
          },
        },
      },
      (request, reply) => {
        const view = manager.getView();
        if (view) {
          view.send(
            "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE",
            request.body.shuffle
          );
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    done();
  };
