import { contextBridge, ipcRenderer } from "electron";

type Channel =
  | "PLAYER_REMOTE_PLAY"
  | "PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE"
  | "PLAYER_REMOTE_PLAYBACK_MUTE"
  | "PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME"
  | "PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME";

const validChannels: Channel[] = [
  "PLAYER_REMOTE_PLAY",
  "PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE",
  "PLAYER_REMOTE_PLAYBACK_MUTE",
  "PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME",
  "PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME",
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
    player: typeof api;
  }
}

contextBridge.exposeInMainWorld("player", api);
