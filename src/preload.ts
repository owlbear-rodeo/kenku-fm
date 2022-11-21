import os from "os";
import { contextBridge, ipcRenderer } from "electron";

import { BrowserViewManagerPreload } from "./preload/managers/BrowserViewManagerPreload";

const viewManager = new BrowserViewManagerPreload();

window.addEventListener("load", () => {
  viewManager.load();
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
  | "BROWSER_VIEW_NEW_TAB"
  | "BROWSER_VIEW_CLOSE_TAB"
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
  "BROWSER_VIEW_NEW_TAB",
  "BROWSER_VIEW_CLOSE_TAB",
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
  },
  leaveChannel: (channelId: string) => {
    ipcRenderer.send("DISCORD_LEAVE_CHANNEL", channelId);
  },
  setLoopack: (loopback: boolean) => {
    viewManager.setLoopback(loopback);
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
  playerStartRemote: (address: string, port: string) => {
    ipcRenderer.send("PLAYER_START_REMOTE", address, port);
  },
  playerStopRemote: () => {
    ipcRenderer.send("PLAYER_STOP_REMOTE");
  },
  startExternalAudioCapture: (deviceId: string) => {
    return viewManager.startExternalAudioCapture(deviceId);
  },
  stopExternalAudioCapture: (deviceId: string) => {
    viewManager.stopExternalAudioCapture(deviceId);
  },
  startBrowserStream: (streamingMode: "lowLatency" | "performance") => {
    viewManager.startBrowserStream(streamingMode);
  },
  toggleMaximize: () => {
    viewManager.toggleMaximize();
  },
  minimize: () => {
    viewManager.minimize();
  },
  close: () => {
    viewManager.close();
  },
  platform: os.platform(),
};

declare global {
  interface Window {
    kenku: typeof api;
  }
}

contextBridge.exposeInMainWorld("kenku", api);
