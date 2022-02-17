import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginCallback } from "fastify";

import { PlayerManager } from "../../../managers/PlayerManager";
import { ReplyError, VIEW_ERROR } from "../..";

const StopIDRequest = Type.Object({
  id: Type.String(),
});
type StopIDRequestType = Static<typeof StopIDRequest>;

export const stop: (manager: PlayerManager) => FastifyPluginCallback =
  (manager) => (fastify, _, done) => {
    fastify.put<{
      Body: StopIDRequestType;
      Reply: StopIDRequestType | ReplyError;
    }>(
      "/",
      {
        schema: {
          body: StopIDRequest,
          response: {
            200: StopIDRequest,
          },
        },
      },
      (request, reply) => {
        const id = request.body.id;
        const view = manager.getView();
        if (view) {
          view.send("PLAYER_REMOTE_SOUNDBOARD_STOP", id);
          reply.status(200).send(request.body);
        } else {
          reply.status(503).send(VIEW_ERROR);
        }
      }
    );

    done();
  };
