import { app, autoUpdater, BrowserWindow } from "electron";
import log from "electron-log";

function checkForAppUpdates() {
  if (process.platform === "win32") {
    const squirrelCommand = process.argv[1];
    if (squirrelCommand === "--squirrel-firstrun") {
      return;
    }
  }

  if (app.isReady()) {
    autoUpdater.checkForUpdates()
  }
}

export function runAutoUpdate(window: BrowserWindow): void {
  if (process.platform === "win32" || process.platform == "darwin") {
    const server = "https://download.kenku.fm"
    let url = `${server}/update/${process.platform}/${app.getVersion()}`

    if (process.platform === "darwin" && process.arch === "arm64") {
      url = `${server}/update/${process.platform}_arm64/${app.getVersion()}`
    }

    autoUpdater.setFeedURL({ url })

    const handleError = (e: Error) => {
      log.errorHandler.handle(e, { showDialog: false });
    }
    const handleUpdateDownloaded = () => {
      window.webContents.send("MESSAGE", "Update Available. Restart to apply.");
    }

    autoUpdater.on("error", handleError)
    autoUpdater.on("update-downloaded", handleUpdateDownloaded)

    // Check for first update after 1 minute
    const timeout = setTimeout(() => {
      checkForAppUpdates();
    }, 60000)

    // Check for other updates every 15 minutes
    const interval = setInterval(() => {
      checkForAppUpdates();
    }, 900000)

    window.on("close", () => {
      autoUpdater.off("error", handleError);
      autoUpdater.off("update-downloaded", handleUpdateDownloaded);
      clearTimeout(timeout);
      clearInterval(interval);
    });
  }
}

