import { contextBridge, ipcRenderer } from "electron";

type Channel = "REMOTE_PLAY";

const validChannels: Channel[] = ["REMOTE_PLAY"];

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
