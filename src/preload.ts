import { contextBridge, IpcRendererEvent } from "electron";
import { ipcRenderer } from "electron";

const validChannels = ["error", "message", "info", "validation"];

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
  getInfo: (url: string, id: string) => {
    ipcRenderer.send("getInfo", url, id);
  },
  validateUrl: (url: string, id: string) => {
    ipcRenderer.send("validateUrl", url, id);
  },
};

declare global {
  interface Window {
    discord: typeof api;
  }
}

contextBridge.exposeInMainWorld("discord", api);
