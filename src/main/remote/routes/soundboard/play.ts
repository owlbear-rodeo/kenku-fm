import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginCallback } from "fastify";

import { PlayerManager } from "../../../managers/PlayerManager";
import { ReplyError, VIEW_ERROR } from "../..";

const PlayIDRequest = Type.Object({
  id: Type.String(),
});
type PlayIDRequestType = Static<typeof PlayIDRequest>;

export const play: (manager: PlayerManager) => FastifyPluginCallback =
  (manager) => (fastify, _, done) => {
    fastify.put<{
      Body: PlayIDRequestType;
      Reply: PlayIDRequestType | ReplyError;
    }>(
      "/",
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
          view.send("PLAYER_REMOTE_SOUNDBOARD_PLAY", id);
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    done();
  };
