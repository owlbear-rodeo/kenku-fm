import os from "os";
import {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  powerSaveBlocker,
} from "electron";
import "./menu";
import "./log";
import icon from "./assets/icon.png";
import { getMalformedUserAgent, getUserAgent } from "./main/userAgent";
import { SessionManager } from "./main/managers/SessionManager";
import { runAutoUpdate } from "./autoUpdate";
import { getSavedBounds, saveWindowBounds } from "./bounds";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let window: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  const minWidth = 800;
  const minHeight = 600;

  // Create the browser window.
  const { bounds, maximized } = getSavedBounds(minWidth, minHeight);

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 18 },
    icon: icon,
    minWidth,
    minHeight,
    ...bounds,
  });

  if (maximized) {
    mainWindow.maximize();
  }

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  let session = new SessionManager(mainWindow);

  mainWindow.webContents.on("did-start-loading", () => {
    // Restart the session on refresh
    session.destroy();
    session = new SessionManager(mainWindow);
  });

  // Spoof user agent for window.navigator
  mainWindow.webContents.setUserAgent(getUserAgent());

  // Prevent app suspension for Kenku FM to avoid playback issues
  const powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension");

  mainWindow.on("close", () => {
    session.destroy();
    window = null;
    powerSaveBlocker.stop(powerSaveBlockerId);
  });

  saveWindowBounds(mainWindow);

  if (app.isPackaged) {
    runAutoUpdate(mainWindow);
  }

  window = mainWindow;
};

const spoofUserAgent = () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Google blocks sign in on CEF so spoof user agent for network requests
    details.requestHeaders["User-Agent"] = details.url.includes("google.com")
      ? getMalformedUserAgent()
      : getUserAgent();
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
};

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(async () => {
    createWindow();
    spoofUserAgent();
  });

  app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.on("GET_VERSION", (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on("GET_PLATFORM", (event) => {
    event.returnValue = os.platform();
  });

  ipcMain.handle("CLEAR_CACHE", async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ["cookies", "shadercache", "cachestorage"],
    });
  });
}
