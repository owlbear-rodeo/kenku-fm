import { contextBridge, ipcRenderer } from "electron";
import { LogoScrape } from "logo-scrape";

import { BrowserViewManagerPreload } from "./preload/managers/BrowserViewManagerPreload";

const viewManager = new BrowserViewManagerPreload();

window.addEventListener("load", () => {
  viewManager.load();
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
  disconnect: (token: string) => {
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
  appIcon: (url: string) => {
    return LogoScrape.getLogos(url)
      .then((icons: any) => {
        // Find icon with the largest size
        const sorted = icons.sort((a: any, b: any) => {
          const aSize = parseInt((a.size || "0x0").split("x")[0] || 0);
          const bSize = parseInt((b.size || "0x0").split("x")[0] || 0);
          return bSize - aSize;
        });
        const urls = sorted.map((icon: any) => icon.url);
        return urls[0] || "";
      })
      .catch((err: Error) => {
        console.error(err);
        return "";
      });
  },
};

declare global {
  interface Window {
    kenku: typeof api;
  }
}
contextBridge.exposeInMainWorld("kenku", api);
