import { app, autoUpdater, dialog, BrowserWindow, components, session, shell } from "electron";
import "./menu";
import icon from "./assets/icon.png";
import { getUserAgent } from "./main/userAgent";
import { SessionManager } from "./main/managers/SessionManager";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    icon: icon,
    minWidth: 500,
    minHeight: 375,
  });

  const session = new SessionManager(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.on("new-window", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on("close", () => {
    session.destroy();
  });
};

const spoofUserAgent = () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Google blocks sign in on CEF so spoof user agent
    details.requestHeaders["User-Agent"] = getUserAgent();
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
};

// Workaround to allow for webpack support with widevine
// https://github.com/castlabs/electron-releases/issues/116
const widevine = components;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Wait for widevine to load
  await widevine.whenReady();
  console.log("components ready:", components.status());

  createWindow();
  spoofUserAgent();
});

const server = "https://hazel-sage-beta.vercel.app/"
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url })

setInterval(() => {
  autoUpdater.checkForUpdates()
}, 1200000)

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('error', message => {
  console.error('There was a problem updating the application')
  console.error(message)
})

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
