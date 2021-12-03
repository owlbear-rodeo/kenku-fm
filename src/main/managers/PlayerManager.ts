import { ipcMain, BrowserWindow, webContents } from "electron";
import store from "../store";
import Fastify, { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { registerRemote } from "../remote";

declare const PLAYER_WINDOW_WEBPACK_ENTRY: string;
declare const PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const PlayURLRequest = Type.Object({
  url: Type.String(),
  title: Type.String(),
});
type PlayURLRequestType = Static<typeof PlayURLRequest>;

const PlayIDRequest = Type.Object({
  id: Type.String(),
});
type PlayIDRequestType = Static<typeof PlayIDRequest>;

const MuteRequest = Type.Object({
  mute: Type.Boolean(),
});
type MuteRequestType = Static<typeof MuteRequest>;

const VolumeRequest = Type.Object({
  volume: Type.Number(),
});
type VolumeRequestType = Static<typeof VolumeRequest>;

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

  getView() {
    if (this.registeredViewId) {
      return webContents.fromId(this.registeredViewId);
    }
  }

  startRemote() {
    this.fastify = Fastify();

    registerRemote(this);

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
