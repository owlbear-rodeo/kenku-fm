import { ipcMain, BrowserWindow, webContents } from "electron";
import store from "../store";
import Fastify, { FastifyInstance } from "fastify";

declare const PLAYER_WINDOW_WEBPACK_ENTRY: string;
declare const PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

type PlayRequest = {
  url: string;
  title: string;
  loop: boolean;
};

export class PlayerManager {
  registeredViewId?: number;
  fastify: FastifyInstance | null = null;
  host = store.get("remoteHost");
  port = store.get("remotePort");

  constructor() {
    ipcMain.on("PLAYER_GET_URL", this._handleGetURL);
    ipcMain.on("PLAYER_GET_PRELOAD_URL", this._handleGetPreloadURL);
    ipcMain.on("PLAYER_REGISTER_VIEW", this._handleRegisterView);
  }

  destroy() {
    ipcMain.off("PLAYER_GET_URL", this._handleGetURL);
    ipcMain.off("PLAYER_GET_PRELOAD_URL", this._handleGetPreloadURL);
    ipcMain.off("PLAYER_REGISTER_VIEW", this._handleRegisterView);
  }

  startRemote() {
    this.fastify = Fastify();

    this.fastify.post<{ Body: PlayRequest; Reply: PlayRequest }>(
      "/play",
      (request, reply) => {
        const url = request.body.url || "";
        const title = request.body.title || "";
        const loop = request.body.loop || false;
        if (this.registeredViewId) {
          const view = webContents.fromId(this.registeredViewId);
          if (view) {
            view.send("PLAYER_REMOTE_PLAY", url, title, loop);
          }
        }
        reply.status(200).send(request.body);
      }
    );

    this.fastify.post("/playback/play-pause", (_, reply) => {
      if (this.registeredViewId) {
        const view = webContents.fromId(this.registeredViewId);
        if (view) {
          view.send("PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE");
        }
      }
      reply.status(200).send();
    });

    this.fastify.post("/playback/mute", (_, reply) => {
      if (this.registeredViewId) {
        const view = webContents.fromId(this.registeredViewId);
        if (view) {
          view.send("PLAYER_REMOTE_PLAYBACK_MUTE");
        }
      }
      reply.status(200).send();
    });

    this.fastify.post("/playback/increase-volume", (_, reply) => {
      if (this.registeredViewId) {
        const view = webContents.fromId(this.registeredViewId);
        if (view) {
          view.send("PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME");
        }
      }
      reply.status(200).send();
    });

    this.fastify.post("/playback/decrease-volume", (_, reply) => {
      if (this.registeredViewId) {
        const view = webContents.fromId(this.registeredViewId);
        if (view) {
          view.send("PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME");
        }
      }
      reply.status(200).send();
    });

    this.fastify.listen(this.port, this.host, (err) => {
      const windows = BrowserWindow.getAllWindows();
      if (err) {
        for (let window of windows) {
          window.webContents.send("ERROR", err.message);
        }
        this.stopRemote();
      } else {
        for (let window of windows) {
          window.webContents.send("PLAYER_REMOTE_ENABLED", true);
        }
      }
    });
  }

  stopRemote() {
    if (this.fastify) {
      this.fastify.close();
      this.fastify = null;

      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("PLAYER_REMOTE_ENABLED", false);
      }
    }
  }

  getRemoteInfo() {
    return `Running: ${this.fastify !== null}\nHost: ${this.host}\nPort: ${
      this.port
    }`;
  }

  _handleGetURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_WEBPACK_ENTRY;
  };

  _handleGetPreloadURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY;
  };

  _handleRegisterView = (_: Electron.IpcMainEvent, viewId: number) => {
    this.registeredViewId = viewId;
  };
}
