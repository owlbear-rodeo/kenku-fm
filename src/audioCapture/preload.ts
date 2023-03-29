import { ipcRenderer } from "electron";

import { AudioCaptureManagerPreload } from "../preload/managers/AudioCaptureManagerPreload";

const audioCaptureManager = new AudioCaptureManagerPreload();

ipcRenderer.on(
  "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
  (_, viewId: number, mediaSourceId: string) => {
    audioCaptureManager.startBrowserViewStream(viewId, mediaSourceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
  (_, viewId: number) => {
    audioCaptureManager.stopBrowserViewStream(viewId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_BROWSER_VIEW_MUTED",
  (_, viewId: number, muted: boolean) => {
    audioCaptureManager.setMuted(viewId, muted);
  }
);

ipcRenderer.on("AUDIO_CAPTURE_SET_LOOPBACK", (_, loopback: boolean) => {
  audioCaptureManager.setLoopback(loopback);
});

ipcRenderer.on(
  "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
  (_, deviceId: string) => {
    audioCaptureManager.startExternalAudioCapture(deviceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
  (_, deviceId: string) => {
    audioCaptureManager.stopExternalAudioCapture(deviceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_START",
  (_, streamingMode: "lowLatency" | "performance") => {
    audioCaptureManager.start(streamingMode);
  }
);
