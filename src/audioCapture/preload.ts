import { contextBridge, ipcRenderer } from "electron";

type Channel =
  | "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM"
  | "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM"
  | "AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS"
  | "AUDIO_CAPTURE_BROWSER_VIEW_MUTED"
  | "AUDIO_CAPTURE_SET_LOOPBACK"
  | "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE"
  | "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE"
  | "AUDIO_CAPTURE_START_RTC"
  | "AUDIO_CAPTURE_STOP_RTC"
  | "AUDIO_CAPTURE_RTC_CANDIDATE"
  | "AUDIO_CAPTURE_RTC_CLOSE";

const validChannels: Channel[] = [
  "AUDIO_CAPTURE_START_BROWSER_VIEW_STREAM",
  "AUDIO_CAPTURE_STOP_BROWSER_VIEW_STREAM",
  "AUDIO_CAPTURE_STOP_ALL_BROWSER_VIEW_STREAMS",
  "AUDIO_CAPTURE_BROWSER_VIEW_MUTED",
  "AUDIO_CAPTURE_SET_LOOPBACK",
  "AUDIO_CAPTURE_START_EXTERNAL_AUDIO_CAPTURE",
  "AUDIO_CAPTURE_STOP_EXTERNAL_AUDIO_CAPTURE",
  "AUDIO_CAPTURE_START_RTC",
  "AUDIO_CAPTURE_STOP_RTC",
  "AUDIO_CAPTURE_RTC_CANDIDATE",
  "AUDIO_CAPTURE_RTC_CLOSE",
];

const api = {
  on: (channel: Channel, callback: (...args: any[]) => any) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_: any, ...args: any[]) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  error: (message: string) => {
    ipcRenderer.send("ERROR", message);
  },
  log: (level: string, message: string) => {
    ipcRenderer.send("LOG", level, message);
  },
  rtcCreateConnection: (): Promise<void> => {
    return ipcRenderer.invoke("AUDIO_CAPTURE_RTC_CREATE_CONNECTION");
  },
  rtcSignal: (offer: string): Promise<string> => {
    return ipcRenderer.invoke("AUDIO_CAPTURE_RTC_SIGNAL", offer);
  },
  rtcAddCandidate: (candidate: string): Promise<void> => {
    return ipcRenderer.invoke("AUDIO_CAPTURE_RTC_ADD_CANDIDATE", candidate);
  },
};

declare global {
  interface Window {
    capture: typeof api;
  }
}

contextBridge.exposeInMainWorld("capture", api);
