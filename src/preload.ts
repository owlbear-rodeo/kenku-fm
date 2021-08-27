import { contextBridge, IpcRendererEvent } from "electron";
import { ipcRenderer } from "electron";

const validChannels = ["error", "message"];

const api = {
  play: (url: string) => {
    ipcRenderer.send("play", url);
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_: IpcRendererEvent, ...args: any[]) =>
        callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel: string) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
};

declare global {
  interface Window {
    discord: typeof api;
  }
}

contextBridge.exposeInMainWorld("discord", api);
