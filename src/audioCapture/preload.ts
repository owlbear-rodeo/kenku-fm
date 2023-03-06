import { ipcRenderer } from "electron";

import { AudioCapture } from "./AudioCapture";

const audioCapture = new AudioCapture();

ipcRenderer.on(
  "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
  (_, viewId: number, mediaSourceId: string) => {
    audioCapture.startBrowserViewStream(viewId, mediaSourceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
  (_, viewId: number) => {
    audioCapture.stopBrowserViewStream(viewId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_BROWSER_VIEW_MUTED",
  (_, viewId: number, muted: boolean) => {
    audioCapture.setMuted(viewId, muted);
  }
);

ipcRenderer.on("AUDIO_CAPTURE_SET_LOOPBACK", (_, loopback: boolean) => {
  audioCapture.setLoopback(loopback);
});

ipcRenderer.on(
  "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
  (_, deviceId: string) => {
    audioCapture.startExternalAudioCapture(deviceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
  (_, deviceId: string) => {
    audioCapture.stopExternalAudioCapture(deviceId);
  }
);

ipcRenderer.on(
  "AUDIO_CAPTURE_START",
  (_, streamingMode: "lowLatency" | "performance") => {
    audioCapture.start(streamingMode);
  }
);
