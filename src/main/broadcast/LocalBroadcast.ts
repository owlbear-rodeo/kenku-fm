import { PassThrough, Readable, Writable } from "stream";
import prism from "prism-media";
import Hapi from "@hapi/hapi";

const BITRATE = 48000;
const CHANNELS = 2;

/**
 * Local broadcaster that encodes and audio stream as mp3
 * and broadcasts it to the current listeners
 */
export class LocalBroadcast {
  _listeners: Writable[] = [];
  server: Hapi.Server;

  constructor(port = 3333, address = "localhost") {
    this.server = Hapi.server({
      port,
      address,
    });
    this._setupRoutes();
    this.server.start();
  }

  _setupRoutes() {
    this.server.route({
      method: "GET",
      path: "/stream",
      handler: (request, h) => {
        const listener = new PassThrough();
        this.add(listener);
        request.events.once("disconnect", () => {
          this.remove(listener);
        });
        return h.response(listener).type("audio/mpeg");
      },
      options: {
        cors: {
          origin: ["*"],
        },
      },
    });

    this.server.route({
      method: "GET",
      path: "/",
      handler: (_, h) => {
        return h
          .response(
            `
          <!DOCTYPE html>
    <html>
    <head>
        <title>Audio</title>
    </head>
    <body>
      <audio src="/stream" preload="none" controls autoplay></audio>
    </body>
    </html>
          `
          )
          .type("text/html");
      },
    });
  }

  add(listener: Writable) {
    this._listeners.push(listener);
  }

  remove(listener: Writable) {
    const index = this._listeners.indexOf(listener);
    if (index >= 0) {
      this._listeners.splice(index);
    }
  }

  play(input: Readable): PassThrough {
    // Ensure it is encoded as an mp3
    const transcoder = new prism.FFmpeg({
      args: [
        "-analyzeduration",
        "0",
        "-loglevel",
        "0",
        "-ar",
        `${BITRATE}`,
        "-ac",
        `${CHANNELS}`,
        "-f",
        "mp3",
      ],
    });
    const output = new PassThrough();
    const dispatcher = input.pipe(transcoder).pipe(output);

    // Send data from the dispatcher to all the current listeners
    dispatcher.on("data", (chunk) => {
      for (const listener of this._listeners) {
        listener.write(chunk);
      }
    });

    return dispatcher;
  }
}
