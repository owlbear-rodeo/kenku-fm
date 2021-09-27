import { contextBridge, ipcRenderer } from "electron";

import { BrowserViewManagerPreload } from "./preload/managers/BrowserViewManagerPreload";
import store from "./preload/store";

const viewManager = new BrowserViewManagerPreload();

window.addEventListener("load", () => {
  viewManager.load();
  // Hydrate saved options
  ipcRenderer.emit("SHOW_CONTROLS", undefined, store.get("showControls"));
});

window.addEventListener("beforeunload", () => {
  ipcRenderer.send("DISCORD_DISCONNECT");
  viewManager.destroy();
});

type Channel =
  | "ERROR"
  | "MESSAGE"
  | "INFO"
  | "DISCORD_READY"
  | "DISCORD_DISCONNECTED"
  | "DISCORD_VOICE_CHANNELS"
  | "DISCORD_CHANNEL_JOINED"
  | "DISCORD_CHANNEL_LEFT"
  | "SHOW_CONTROLS"
  | "BROWSER_VIEW_DID_NAVIGATE";

const validChannels: Channel[] = [
  "ERROR",
  "MESSAGE",
  "INFO",
  "DISCORD_READY",
  "DISCORD_DISCONNECTED",
  "DISCORD_VOICE_CHANNELS",
  "DISCORD_CHANNEL_JOINED",
  "DISCORD_CHANNEL_LEFT",
  "SHOW_CONTROLS",
  "BROWSER_VIEW_DID_NAVIGATE",
];

const api = {
  connect: (token: string) => {
    ipcRenderer.send("DISCORD_CONNECT", token);
  },
  disconnect: () => {
    ipcRenderer.send("DISCORD_DISCONNECT");
  },
  joinChannel: (channelId: string) => {
    ipcRenderer.send("DISCORD_JOIN_CHANNEL", channelId);
    viewManager.setLoopback(channelId === "local");
  },
  createBrowserView: (
    url: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<number> => {
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
  appIcon: async (appURL: string): Promise<string> => {
    return ipcRenderer.invoke("APP_ICON_REQUEST", appURL);
  },
};

declare global {
  interface Window {
    kenku: typeof api;
  }
}

contextBridge.exposeInMainWorld("kenku", api);
