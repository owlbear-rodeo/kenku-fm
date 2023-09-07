import { ipcMain, BrowserWindow, webContents } from "electron";
import Fastify, { FastifyInstance } from "fastify";
import { registerRemote } from "../remote";

declare const PLAYER_WINDOW_WEBPACK_ENTRY: string;
declare const PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class PlayerManager {
  private registeredViewId?: number;
  fastify: FastifyInstance | null = null;
  private address = "127.0.0.1";
  private port = "3333";

  constructor() {
    ipcMain.on("PLAYER_GET_URL", this.handleGetURL);
    ipcMain.on("PLAYER_GET_PRELOAD_URL", this.handleGetPreloadURL);
    ipcMain.on("PLAYER_REGISTER_VIEW", this.handleRegisterView);
    ipcMain.on("PLAYER_START_REMOTE", this.handleStartRemote);
    ipcMain.on("PLAYER_STOP_REMOTE", this.handleStopRemote);
  }

  destroy() {
    ipcMain.off("PLAYER_GET_URL", this.handleGetURL);
    ipcMain.off("PLAYER_GET_PRELOAD_URL", this.handleGetPreloadURL);
    ipcMain.off("PLAYER_REGISTER_VIEW", this.handleRegisterView);
    ipcMain.off("PLAYER_START_REMOTE", this.handleStartRemote);
    ipcMain.off("PLAYER_STOP_REMOTE", this.handleStopRemote);
    this.stopRemote();
  }

  getView() {
    if (this.registeredViewId) {
      return webContents.fromId(this.registeredViewId);
    }
  }

  private startRemote(address: string, port: string) {
    this.address = address;
    this.port = port;

    this.fastify = Fastify();

    registerRemote(this);

    this.fastify.listen(this.port, this.address, (err) => {
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

  private stopRemote() {
    if (this.fastify) {
      this.fastify.close();
      this.fastify = null;

      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("PLAYER_REMOTE_ENABLED", false);
      }
    }
  }

  private getRemoteInfo() {
    return `Running: ${this.fastify !== null}\nAddress: ${
      this.address
    }\nPort: ${this.port}`;
  }

  private handleStartRemote = (
    _: Electron.IpcMainEvent,
    address: string,
    port: string
  ) => this.startRemote(address, port);

  private handleStopRemote = () => this.stopRemote();

  private handleGetURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_WEBPACK_ENTRY;
  };

  private handleGetPreloadURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY;
  };

  private handleRegisterView = (_: Electron.IpcMainEvent, viewId: number) => {
    this.registeredViewId = viewId;
  };
}
