import { BrowserWindow, ipcMain, webContents } from "electron";

declare const AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY: string;
declare const AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

import severus, { RTCClient, Broadcast } from "severus";
import { RTCManager } from "./RTCManager";

/**
 * Manager to capture audio from browser views and external audio devices
 * This class is to be run on the main thread
 */
export class AudioCaptureManagerMain {
  private browserWindow: BrowserWindow;
  private rtcManager: RTCManager;
  broadcast: Broadcast;

  constructor() {
    this.browserWindow = new BrowserWindow({
      webPreferences: {
        preload: AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
      minimizable: false,
      frame: false,
      show: false
    });
    this.browserWindow.webContents.loadURL(AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY);
    this.browserWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        if (
          details.url.endsWith("audio_capture_window") ||
          details.url.endsWith("audio_capture_window/index.html")
        ) {
          details.responseHeaders["Cross-Origin-Opener-Policy"] = [
            "same-origin",
          ];
          details.responseHeaders["Cross-Origin-Embedder-Policy"] = [
            "require-corp",
          ];
          callback({ responseHeaders: details.responseHeaders });
        } else {
          callback(details.responseHeaders);
        }
      }
    );

    this.broadcast = severus.broadcastNew();
    this.rtcManager = new RTCManager(this.browserWindow, this.broadcast);

    ipcMain.on("AUDIO_CAPTURE_SET_LOOPBACK", this.handleSetLoopback);
    ipcMain.on("AUDIO_CAPTURE_SET_MUTED", this.handleSetMuted);
    ipcMain.on(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      this.handleStartExternalAudioCapture
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      this.handleStopExternalAudioCapture
    );
    ipcMain.on(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this.handleStartBrowserViewStream
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this.handleStopBrowserViewStream
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS",
      this.handleStopAllBrowserViewStreams
    );
    ipcMain.on("ERROR", this.handleError);
  }

  destroy() {
    ipcMain.off("AUDIO_CAPTURE_SET_LOOPBACK", this.handleSetLoopback);
    ipcMain.off("AUDIO_CAPTURE_SET_MUTED", this.handleSetMuted);
    ipcMain.off(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      this.handleStartExternalAudioCapture
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      this.handleStopExternalAudioCapture
    );

    ipcMain.off(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this.handleStartBrowserViewStream
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this.handleStopBrowserViewStream
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS",
      this.handleStopAllBrowserViewStreams
    );
    ipcMain.off("ERROR", this.handleError);

    this.rtcManager.destroy();
    this.broadcast = undefined;
    this.browserWindow.webContents.close();
    this.browserWindow.close();
    (this.browserWindow.webContents as any).destroy();
  }

  private handleSetLoopback = (_: Electron.IpcMainEvent, loopback: boolean) => {
    this.browserWindow.webContents.send("AUDIO_CAPTURE_SET_LOOPBACK", loopback);
  };

  private handleSetMuted = (
    _: Electron.IpcMainEvent,
    viewId: number,
    muted: boolean
  ) => {
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_BROWSER_VIEW_MUTED",
      viewId,
      muted
    );
  };

  private handleStartExternalAudioCapture = (
    _: Electron.IpcMainEvent,
    deviceId: string
  ) => {
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      deviceId
    );
  };

  private handleStopExternalAudioCapture = (
    _: Electron.IpcMainEvent,
    deviceId: string
  ) => {
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      deviceId
    );
  };

  getRTCClient = async (): Promise<RTCClient | undefined> => {
    if (!this.rtcManager.rtc) {
      this.rtcManager.createClientIfNeeded();
      return new Promise((resolve) => {
        this.rtcManager.once("create", resolve);
      });
    }

    return this.rtcManager.rtc;
  };

  stopAndRemoveRTCClient = () => {
    this.rtcManager.stopAndRemoveClient();
  };

  private handleStartBrowserViewStream = (
    _: Electron.IpcMainEvent,
    viewId: number
  ) => {
    const contents = webContents.fromId(viewId);
    const mediaSourceId = contents.getMediaSourceId(
      this.browserWindow.webContents
    );
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      viewId,
      mediaSourceId
    );
  };

  private handleStopBrowserViewStream = (
    _: Electron.IpcMainEvent,
    viewId: number
  ) => {
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      viewId
    );
  };

  private handleStopAllBrowserViewStreams = (_: Electron.IpcMainEvent) => {
    this.browserWindow.webContents.send(
      "AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS"
    );
  };

  private handleError = (_: Electron.IpcMainEvent, message: string) => {
    const windows = BrowserWindow.getAllWindows();
    for (let window of windows) {
      window.webContents.send("ERROR", message);
    }
  };
}
