import { ipcMain } from "electron";
import pageIcon from "@owlbear-rodeo/page-icon";

export class FaviconManager {
  constructor() {
    ipcMain.handle("APP_ICON_REQUEST", this.handleGetIcon);
  }

  destroy() {
    ipcMain.removeHandler("APP_ICON_REQUEST");
  }

  private handleGetIcon = async (
    _: Electron.IpcMainEvent,
    appURL: string
  ): Promise<string> => {
    try {
      const icon = await pageIcon(appURL, { metaTags: false });
      return icon.source;
    } catch {
      return "";
    }
  };
}
