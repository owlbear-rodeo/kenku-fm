import os from "os";
import {
  app,
  BrowserWindow,
  components,
  session,
  shell,
  ipcMain,
  powerSaveBlocker,
} from "electron";
import { configureApplicationProfile } from "./applicationProfile";
import { getMalformedUserAgent, getUserAgent } from "./main/userAgent";
import { SessionManager } from "./main/managers/SessionManager";
import { getSavedBounds, saveWindowBounds } from "./bounds";
import { configureApplicationMenu } from "./menu";
import { createDungeonJockeyCompositionRoot } from "./dungeonJockey/main/compositionRoot";
import { selectStartupRoute } from "./dungeonJockey/main/startupRoute";
import { createApplicationIpc } from "./dungeonJockey/main/applicationIpc";
import { createApplicationEntryPolicy } from "./dungeonJockey/main/applicationEntryPolicy";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const applicationProfile = configureApplicationProfile();
configureApplicationMenu();
console.log(
  `application profile ready: ${applicationProfile.mode} (${applicationProfile.userDataPath})`,
);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let window: BrowserWindow | null = null;
let applicationIpc: ReturnType<typeof createApplicationIpc>;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// This CommonJS package eagerly evaluates Squirrel startup arguments at load time;
// keep the call here to preserve startup ordering.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = (): BrowserWindow => {
  const minWidth = 800;
  const minHeight = 600;

  // Create the browser window.
  const { bounds, maximized } = getSavedBounds(minWidth, minHeight);

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 18 },
    minWidth,
    minHeight,
    ...bounds,
  });

  if (maximized) {
    mainWindow.maximize();
  }

  applicationIpc.bindApplicationWindow(
    mainWindow.webContents,
    createApplicationEntryPolicy(MAIN_WINDOW_WEBPACK_ENTRY, app.isPackaged),
    (url) => {
      void shell.openExternal(url).catch((): void => {});
    },
  );

  const startupRoute = selectStartupRoute(app.isPackaged);
  let refreshVisibleRendererSession: () => void;
  let destroySession: () => void;

  if (startupRoute === "legacy-kenku") {
    // Temporary unpackaged-development recovery route for inherited behavior.
    let legacySession = new SessionManager(mainWindow);
    refreshVisibleRendererSession = () => {
      legacySession.destroy();
      legacySession = new SessionManager(mainWindow);
    };
    destroySession = () => legacySession.destroy();
  } else {
    const dungeonJockeyRoot = createDungeonJockeyCompositionRoot(mainWindow);
    refreshVisibleRendererSession = () =>
      dungeonJockeyRoot.refreshVisibleRendererCompatibilitySession();
    destroySession = () => dungeonJockeyRoot.dispose();
  }

  mainWindow.webContents.on("did-start-loading", () => {
    refreshVisibleRendererSession();
  });

  // Spoof user agent for window.navigator
  mainWindow.webContents.setUserAgent(getUserAgent());

  // Prevent app suspension to avoid playback issues
  const powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension");

  mainWindow.on("close", () => {
    destroySession();
    window = null;
    powerSaveBlocker.stop(powerSaveBlockerId);
  });

  saveWindowBounds(mainWindow);

  // Install identity, navigation and session lifecycle hooks before loading UI.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  return mainWindow;
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
  // Workaround to allow for webpack support with widevine
  // https://github.com/castlabs/electron-releases/issues/116
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(async () => {
    let hasWidevineError = false;

    try {
      // Wait for widevine to load
      await components.whenReady();
      console.log("components ready:", components.status());
    } catch (e) {
      hasWidevineError = true;
      console.error("components failed to load:", JSON.stringify(e, null, 2));
    }

    applicationIpc = createApplicationIpc(ipcMain, () => app.getVersion());
    window = createWindow();

    spoofUserAgent();

    if (hasWidevineError) {
      window.once("ready-to-show", () => {
        window.webContents.send(
          "ERROR",
          "Widevine DRM Error: Licensed music playback is disabled",
        );
      });
    }
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
    if (applicationIpc && BrowserWindow.getAllWindows().length === 0) {
      window = createWindow();
    }
  });

  app.on("will-quit", () => applicationIpc?.dispose());

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
