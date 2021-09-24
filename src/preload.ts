import { contextBridge, ipcRenderer } from "electron";

import { BrowserViewManagerPreload } from "./preload/managers/BrowserViewManagerPreload";

const viewManager = new BrowserViewManagerPreload();

window.addEventListener("load", () => {
  viewManager.load();
});

window.addEventListener("beforeunload", () => {
  ipcRenderer.send("disconnect");
  viewManager.destroy();
});

const validChannels = [
  "error",
  "message",
  "info",
  "ready",
  "disconnect",
  "voiceChannels",
  "channelJoined",
  "channelLeft",
];

const api = {
  connect: (token: string) => {
    ipcRenderer.send("connect", token);
  },
  disconnect: () => {
    ipcRenderer.send("disconnect");
  },
  joinChannel: (channelId: string) => {
    ipcRenderer.send("joinChannel", channelId);
    viewManager.setLoopback(channelId === "local");
  },
  createBrowserView: (
    url: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): number => {
    return viewManager.createBrowserView(url, x, y, width, height);
  },
  removeBrowserView: (id: number) => {
    viewManager.removeBrowserView(id);
  },
  loadURL: (id: number, url: string) => {
    viewManager.loadURL(id, url);
  },
  goForward: (id: number) => {
    viewManager.goForward(id);
  },
  goBack: (id: number) => {
    viewManager.goBack(id);
  },
  reload: (id: number) => {
    viewManager.reload(id);
  },
  on: (channel: string, callback: (...args: any[]) => any) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_: any, ...args: any[]) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel: string) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  appIcon: async (appURL: string) => {
    ipcRenderer.send("APP_ICON_REQUEST", appURL);
    return new Promise((resolve) => {
      ipcRenderer.once("APP_ICON_RESPONSE", (_, icon) => {
        resolve(icon);
      });
    });
  },
};

declare global {
  interface Window {
    kenku: typeof api;
  }
}

contextBridge.exposeInMainWorld("kenku", api);
