/**
 * The audio capture window runs an audio context that
 * combines audio sources from other browser views or external audio devices.
 *
 * It is created as a separate browser view so that it runs in it's own thread
 * free from UI updates.
 */

import { ipcRenderer } from "electron";
import { AudioCapture } from "./AudioCapture";
import { UDPStream } from "./UDPStream";

const audioCapture = new AudioCapture();
const udpStream = new UDPStream(audioCapture.streamSync);

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

ipcRenderer.on("AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS", () => {
  audioCapture.stopAllBrowserViewStreams();
});

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

ipcRenderer.on("AUDIO_CAPTURE_START_STREAM", (_, port: number) => {
  udpStream.start(port);
});

ipcRenderer.on("AUDIO_CAPTURE_STOP_STREAM", () => {
  udpStream.stop();
});
