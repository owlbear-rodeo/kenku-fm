import { ipcMain } from "electron";
import pageIcon from "@owlbear-rodeo/page-icon";

export class FaviconManager {
  constructor() {
    ipcMain.on("APP_ICON_REQUEST", this._handleGetIcon);
  }

  destroy() {
    ipcMain.off("APP_ICON_REQUEST", this._handleGetIcon);
  }

  _handleGetIcon = async (event: Electron.IpcMainEvent, appURL: string) => {
    try {
      const icon = await pageIcon(appURL);
      event.reply("APP_ICON_RESPONSE", icon.source);
    } catch {
      event.reply("APP_ICON_RESPONSE", "");
    }
  };
}
