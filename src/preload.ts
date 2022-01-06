import { contextBridge, ipcRenderer } from "electron";

import { BrowserViewManagerPreload } from "./preload/managers/BrowserViewManagerPreload";
import store from "./preload/store";

const viewManager = new BrowserViewManagerPreload();

window.addEventListener("load", () => {
  viewManager.load();
  // Re-hydrate saved options
  ipcRenderer.emit("SHOW_CONTROLS", undefined, store.get("showControls"));
  ipcRenderer.emit(
    "PLAYER_REMOTE_ENABLED",
    undefined,
    store.get("remoteEnabled")
  );
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
  | "DISCORD_GUILDS"
  | "DISCORD_CHANNEL_JOINED"
  | "DISCORD_CHANNEL_LEFT"
  | "SHOW_CONTROLS"
  | "BROWSER_VIEW_DID_NAVIGATE"
  | "BROWSER_VIEW_TITLE_UPDATED"
  | "BROWSER_VIEW_FAVICON_UPDATED"
  | "BROWSER_VIEW_MEDIA_STARTED_PLAYING"
  | "BROWSER_VIEW_MEDIA_PAUSED"
  | "PLAYER_REMOTE_ENABLED";

const validChannels: Channel[] = [
  "ERROR",
  "MESSAGE",
  "INFO",
  "DISCORD_READY",
  "DISCORD_DISCONNECTED",
  "DISCORD_GUILDS",
  "DISCORD_CHANNEL_JOINED",
  "DISCORD_CHANNEL_LEFT",
  "SHOW_CONTROLS",
  "BROWSER_VIEW_DID_NAVIGATE",
  "BROWSER_VIEW_TITLE_UPDATED",
  "BROWSER_VIEW_FAVICON_UPDATED",
  "BROWSER_VIEW_MEDIA_STARTED_PLAYING",
  "BROWSER_VIEW_MEDIA_PAUSED",
  "PLAYER_REMOTE_ENABLED",
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
    height: number,
    preload?: string
  ): Promise<number> => {
    return viewManager.createBrowserView(url, x, y, width, height, preload);
  },
  removeBrowserView: (id: number) => {
    viewManager.removeBrowserView(id);
  },
  hideBrowserView: (id: number) => {
    viewManager.hideBrowserView(id);
  },
  showBrowserView: (id: number) => {
    viewManager.showBrowserView(id);
  },
  setBrowserViewBounds: (
    id: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    viewManager.setBrowserViewBounds(id, x, y, width, height);
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
  setMuted: (id: number, muted: boolean) => {
    viewManager.setMuted(id, muted);
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
  playerGetURL: (): string => {
    return ipcRenderer.sendSync("PLAYER_GET_URL");
  },
  playerGetPreloadURL: (): string => {
    return ipcRenderer.sendSync("PLAYER_GET_PRELOAD_URL");
  },
  /** Registers a player view with the remote manager so it can send it commands  */
  playerRegisterView: (viewId: number) => {
    ipcRenderer.send("PLAYER_REGISTER_VIEW", viewId);
  },
};

declare global {
  interface Window {
    kenku: typeof api;
  }
}

contextBridge.exposeInMainWorld("kenku", api);
