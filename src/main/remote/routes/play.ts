import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginCallback } from "fastify";

import { PlayerManager } from "../../managers/PlayerManager";
import { ReplyError, VIEW_ERROR } from "../";

const PlayURLRequest = Type.Object({
  url: Type.String(),
  title: Type.String(),
});
type PlayURLRequestType = Static<typeof PlayURLRequest>;

const PlayIDRequest = Type.Object({
  id: Type.String(),
});
type PlayIDRequestType = Static<typeof PlayIDRequest>;

export const play: (manager: PlayerManager) => FastifyPluginCallback =
  (manager) => (fastify, _, done) => {
    fastify.put<{
      Body: PlayURLRequestType;
      Reply: PlayURLRequestType | ReplyError;
    }>(
      "/url",
      {
        schema: {
          body: PlayURLRequest,
          response: {
            200: PlayURLRequest,
          },
        },
      },
      (request, reply) => {
        const { body: track } = request;
        const url = track.url;
        const title = track.title;
        const view = manager.getView();
        if (view) {
          view.send("PLAYER_REMOTE_PLAY_URL", url, title);
          reply.status(200).send(track);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    fastify.put<{
      Body: PlayIDRequestType;
      Reply: PlayIDRequestType | ReplyError;
    }>(
      "/id",
      {
        schema: {
          body: PlayIDRequest,
          response: {
            200: PlayIDRequest,
          },
        },
      },
      (request, reply) => {
        const id = request.body.id;
        const view = manager.getView();
        if (view) {
          view.send("PLAYER_REMOTE_PLAY_ID", id);
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    done();
  };
