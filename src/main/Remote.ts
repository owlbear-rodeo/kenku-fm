import { BrowserWindow } from "electron";
import store from "./store";
import Fastify, { FastifyInstance } from "fastify";

type OpenRequest = {
  url: string;
};

export default class Remote {
  fastify: FastifyInstance | null = null;
  host = store.get("remoteHost");
  port = store.get("remotePort");

  start() {
    this.fastify = Fastify();

    this.fastify.post<{ Body: OpenRequest; Reply: OpenRequest }>(
      "/open",
      (request, reply) => {
        const url = request.body.url || "";
        const windows = BrowserWindow.getAllWindows();
        for (let window of windows) {
          window.webContents.send("REMOTE_OPEN_URL", url);
        }
        reply.status(200).send(request.body);
      }
    );

    this.fastify.listen(this.port, this.host, (err) => {
      const windows = BrowserWindow.getAllWindows();
      if (err) {
        for (let window of windows) {
          window.webContents.send("ERROR", err.message);
        }
        this.stop();
      } else {
        for (let window of windows) {
          window.webContents.send("REMOTE_ENABLED", true);
        }
      }
    });
  }

  stop() {
    if (this.fastify) {
      this.fastify.close();
      this.fastify = null;

      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("REMOTE_ENABLED", false);
      }
    }
  }

  getInfo() {
    return `Running: ${this.fastify !== null}\nHost: ${this.host}\nPort: ${
      this.port
    }`;
  }
}
