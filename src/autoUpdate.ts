import { app, autoUpdater, BrowserWindow } from "electron";

function checkForAppUpdates() {
  if (process.platform === "win32") {
    const squirrelCommand = process.argv[1];
    if (squirrelCommand === "--squirrel-firstrun") {
      return;
    }
  }

  if (app.isReady()) {
    autoUpdater.checkForUpdates();
  }
}

export function runAutoUpdate(window: BrowserWindow) {
  if (process.platform === "win32" || process.platform == "darwin") {
    const server = "https://download.kenku.fm";
    let url = `${server}/update/${process.platform}/${process.arch}/${app.getVersion()}`;

    autoUpdater.setFeedURL({ url });

    const handleError = () => {};
    const handleUpdateDownloaded = () => {
      window.webContents.send("MESSAGE", "Update Available. Restart to apply.");
    };

    autoUpdater.on("error", handleError);
    autoUpdater.on("update-downloaded", handleUpdateDownloaded);

    // Check for updates every 15 minutes
    const interval = setInterval(() => {
      checkForAppUpdates();
    }, 900000);

    window.on("close", () => {
      autoUpdater.off("error", handleError);
      autoUpdater.off("update-downloaded", handleUpdateDownloaded);
      clearInterval(interval);
    });
  }
}
