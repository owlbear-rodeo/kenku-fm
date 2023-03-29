import { BrowserView, ipcMain, webContents } from "electron";
import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import prism from "prism-media";

declare const AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY: string;
declare const AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

interface AudioCaptureManagerEvents {
  streamStart: (stream: Readable) => void;
  streamEnd: () => void;
}

/**
 * Manager to capture audio from browser views and external audio devices
 * This class is to be run on the main thread
 * For the render thread counterpart see `AudioCaptureManagerPreload.ts`
 */
export class AudioCaptureManagerMain extends TypedEmitter<AudioCaptureManagerEvents> {
  _browserView: BrowserView;
  _encoder?: prism.opus.Encoder;
  _wss: WebSocketServer;

  constructor() {
    super();
    this._browserView = new BrowserView({
      webPreferences: {
        preload: AUDIO_CAPTURE_WINDOW_PRELOAD_WEBPACK_ENTRY,
        // Disable sandbox for the audio capture window
        // This allows us to use a web worker in the preload script
        // https://github.com/electron/forge/issues/2931
        // This has little security concerns as we don't load any third party
        // content in the capture window
        sandbox: false,
      },
    });
    this._browserView.webContents.loadURL(AUDIO_CAPTURE_WINDOW_WEBPACK_ENTRY);
    this._wss = new WebSocketServer({ port: 0 });

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
    ipcMain.on("AUDIO_CAPTURE_STREAM_START", this._handleStreamStart);
    ipcMain.on("AUDIO_CAPTURE_STREAM_END", this._handleStreamEnd);
    ipcMain.handle(
      "AUDIO_CAPTURE_GET_WEBSOCKET_ADDRESS",
      this._handleGetWebsocketAddress
    );
    ipcMain.on(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this._handleStartBrowserViewStream
    );
    ipcMain.on(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this._handleStopBrowserViewStream
    );

    this._wss.on("connection", this._handleWebsocketConnection);
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
    ipcMain.off("AUDIO_CAPTURE_STREAM_START", this._handleStreamStart);
    ipcMain.off("AUDIO_CAPTURE_STREAM_END", this._handleStreamEnd);
    ipcMain.removeHandler("AUDIO_CAPTURE_GET_WEBSOCKET_ADDRESS");
    ipcMain.off(
      "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
      this._handleStartBrowserViewStream
    );
    ipcMain.off(
      "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
      this._handleStopBrowserViewStream
    );

    (this._browserView.webContents as any).destroy();
    this._handleStreamEnd();
    this._wss.close();
  }

  _handleWebsocketConnection = (ws: WebSocket) => {
    ws.on("message", this._handleStreamData);
  };

  _handleStart = (
    _: Electron.IpcMainEvent,
    streamingMode: "lowLatency" | "performance"
  ) => {
    this._browserView.webContents.send("AUDIO_CAPTURE_START", streamingMode);
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

  _handleStreamStart = (
    _: Electron.IpcMainEvent,
    channels: number,
    frameSize: number,
    sampleRate: number
  ) => {
    this._encoder?.end();

    // Create a pipeline for converting raw PCM data into opus packets
    const encoder = new prism.opus.Encoder({
      channels: channels,
      frameSize: frameSize,
      rate: sampleRate,
    });
    this._encoder = encoder;

    // Setup any listener streams
    this.emit("streamStart", encoder);
  };

  _handleStreamData = async (data: Buffer) => {
    this._encoder?.write(data);
  };

  _handleStreamEnd = () => {
    this._encoder?.end();
    this._encoder = undefined;
    this.emit("streamEnd");
  };

  _handleGetWebsocketAddress = async () => {
    return this._wss.address();
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
