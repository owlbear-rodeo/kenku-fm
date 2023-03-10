import { BrowserView, ipcMain, webContents } from "electron";

declare const AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY: string;
declare const AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

import severus, { RTCClient } from "severus";

/**
 * Manager to capture audio from browser views and external audio devices
 * This class is to be run on the main thread
 */
export class AudioCaptureManagerMain {
  _browserView: BrowserView;
  _rtc: RTCClient;

  constructor() {
    this._browserView = new BrowserView({
      webPreferences: {
        preload: AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });
    this._browserView.webContents.loadURL(AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY);
    this._browserView.webContents.session.webRequest.onHeadersReceived(
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
    this._browserView.webContents.openDevTools();

    ipcMain.on("AUDIO_CAPTURE_START", this._handleStart);
    ipcMain.on("AUDIO_CAPTURE_SET_LOOPBACK", this._handleSetLoopback);
    ipcMain.on("AUDIO_CAPTURE_SET_MUTED", this._handleSetMuted);
    ipcMain.on(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      this._handleStartExternalAudioCapture
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      this._handleStopExternalAudioCapture
    );
    ipcMain.handle("AUDIO_CAPTURE_SIGNAL", this._handleSignal);
    ipcMain.handle("AUDIO_CAPTURE_RECORD", this._handleRecord);
    ipcMain.on(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this._handleStartBrowserViewStream
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this._handleStopBrowserViewStream
    );
  }

  destroy() {
    ipcMain.off("AUDIO_CAPTURE_START", this._handleStart);
    ipcMain.off("AUDIO_CAPTURE_SET_LOOPBACK", this._handleSetLoopback);
    ipcMain.off("AUDIO_CAPTURE_SET_MUTED", this._handleSetMuted);
    ipcMain.off(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      this._handleStartExternalAudioCapture
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      this._handleStopExternalAudioCapture
    );
    ipcMain.removeHandler("AUDIO_CAPTURE_SIGNAL");
    ipcMain.removeHandler("AUDIO_CAPTURE_RECORD");
    ipcMain.off(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this._handleStartBrowserViewStream
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this._handleStopBrowserViewStream
    );

    (this._browserView.webContents as any).destroy();
  }

  _handleStart = (_: Electron.IpcMainEvent, bufferScale: number) => {
    this._browserView.webContents.send("AUDIO_CAPTURE_START", bufferScale);
  };

  _handleSetLoopback = (_: Electron.IpcMainEvent, loopback: boolean) => {
    this._browserView.webContents.send("AUDIO_CAPTURE_SET_LOOPBACK", loopback);
  };

  _handleSetMuted = (
    _: Electron.IpcMainEvent,
    viewId: number,
    muted: boolean
  ) => {
    this._browserView.webContents.send(
      "AUDIO_CAPTURE_BROWSER_VIEW_MUTED",
      viewId,
      muted
    );
  };

  _handleStartExternalAudioCapture = (
    _: Electron.IpcMainEvent,
    deviceId: string
  ) => {
    this._browserView.webContents.send(
      "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
      deviceId
    );
  };

  _handleStopExternalAudioCapture = (
    _: Electron.IpcMainEvent,
    deviceId: string
  ) => {
    this._browserView.webContents.send(
      "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
      deviceId
    );
  };

  _handleSignal = async (_: Electron.IpcMainEvent, offer: string) => {
    this._rtc = await severus.rtcNew();
    return severus.rtcSignal(this._rtc, offer);
  };

  _handleRecord = async (_: Electron.IpcMainEvent, fileName: string) => {
    return severus.rtcStartRecorder(this._rtc, fileName);
  };

  _handleStartBrowserViewStream = (
    _: Electron.IpcMainEvent,
    viewId: number
  ) => {
    const contents = webContents.fromId(viewId);
    const mediaSourceId = contents.getMediaSourceId(
      this._browserView.webContents
    );
    this._browserView.webContents.send(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      viewId,
      mediaSourceId
    );
  };

  _handleStopBrowserViewStream = (_: Electron.IpcMainEvent, viewId: number) => {
    this._browserView.webContents.send(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      viewId
    );
  };
}
