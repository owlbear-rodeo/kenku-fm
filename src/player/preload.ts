import { contextBridge, ipcRenderer } from "electron";
import { PlaybackReply } from "../types/player";

type Channel =
  | "PLAYER_REMOTE_PLAY_URL"
  | "PLAYER_REMOTE_PLAY_ID"
  | "PLAYER_REMOTE_PLAYBACK_REQUEST"
  | "PLAYER_REMOTE_PLAYBACK_PLAY"
  | "PLAYER_REMOTE_PLAYBACK_PAUSE"
  | "PLAYER_REMOTE_PLAYBACK_MUTE"
  | "PLAYER_REMOTE_PLAYBACK_VOLUME"
  | "PLAYER_REMOTE_PLAYBACK_NEXT"
  | "PLAYER_REMOTE_PLAYBACK_PREVIOUS"
  | "PLAYER_REMOTE_PLAYBACK_REPEAT"
  | "PLAYER_REMOTE_PLAYBACK_SHUFFLE";

const validChannels: Channel[] = [
  "PLAYER_REMOTE_PLAY_URL",
  "PLAYER_REMOTE_PLAY_ID",
  "PLAYER_REMOTE_PLAYBACK_REQUEST",
  "PLAYER_REMOTE_PLAYBACK_PLAY",
  "PLAYER_REMOTE_PLAYBACK_PAUSE",
  "PLAYER_REMOTE_PLAYBACK_MUTE",
  "PLAYER_REMOTE_PLAYBACK_VOLUME",
  "PLAYER_REMOTE_PLAYBACK_NEXT",
  "PLAYER_REMOTE_PLAYBACK_PREVIOUS",
  "PLAYER_REMOTE_PLAYBACK_REPEAT",
  "PLAYER_REMOTE_PLAYBACK_SHUFFLE",
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
  playbackReply: (playback: PlaybackReply) => {
    ipcRenderer.send("PLAYER_REMOTE_PLAYBACK_REPLY", playback);
  },
};

declare global {
  interface Window {
    player: typeof api;
  }
}

contextBridge.exposeInMainWorld("player", api);
