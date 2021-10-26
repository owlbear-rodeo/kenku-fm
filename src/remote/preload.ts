import { contextBridge, ipcRenderer } from "electron";

type Channel =
  | "REMOTE_PLAY"
  | "REMOTE_PLAYBACK_PLAY_PAUSE"
  | "REMOTE_PLAYBACK_MUTE"
  | "REMOTE_PLAYBACK_INCREASE_VOLUME"
  | "REMOTE_PLAYBACK_DECREASE_VOLUME";

const validChannels: Channel[] = [
  "REMOTE_PLAY",
  "REMOTE_PLAYBACK_PLAY_PAUSE",
  "REMOTE_PLAYBACK_MUTE",
  "REMOTE_PLAYBACK_INCREASE_VOLUME",
  "REMOTE_PLAYBACK_DECREASE_VOLUME",
];

const api = {
  on: (channel: Channel, callback: (...args: any[]) => any) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_: any, ...args: any[]) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel: Channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
};

declare global {
  interface Window {
    remote: typeof api;
  }
}

contextBridge.exposeInMainWorld("remote", api);
