/**
 * The audio capture window runs an audio context that
 * combines audio sources from other browser views or external audio devices.
 *
 * It is created as a separate browser view so that it runs in it's own thread
 * free from UI updates.
 */

import { AudioCapture } from "./AudioCapture";

const audioCapture = new AudioCapture();

window.capture.on("AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM", (args) => {
  const [viewId, mediaSourceId] = args;
  audioCapture.startBrowserViewStream(viewId, mediaSourceId);
});

window.capture.on("AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM", (args) => {
  const [viewId] = args;
  audioCapture.stopBrowserViewStream(viewId);
});

window.capture.on("AUDIO_CAPTURE_BROWSER_VIEW_MUTED", (args) => {
  const [viewId, muted] = args;
  audioCapture.setMuted(viewId, muted);
});

window.capture.on("AUDIO_CAPTURE_SET_LOOPBACK", (args) => {
  const [loopback] = args;
  audioCapture.setLoopback(loopback);
});

window.capture.on("AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE", (args) => {
  const [deviceId] = args;
  audioCapture.startExternalAudioCapture(deviceId);
});

window.capture.on("AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE", (args) => {
  const [deviceId] = args;
  audioCapture.stopExternalAudioCapture(deviceId);
});

window.capture.on("AUDIO_CAPTURE_START", () => {
  audioCapture.start();
});
