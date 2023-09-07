import { BrowserWindow, ipcMain } from "electron";

export class WindowManager {
  private window: BrowserWindow;
  constructor(window: BrowserWindow) {
    this.window = window;
    ipcMain.on("WINDOW_TOGGLE_MAXIMIZE", this.handleToggleMaximize);
    ipcMain.on("WINDOW_MINIMIZE", this.handleMinimize);
    ipcMain.on("WINDOW_CLOSE", this.handleClose);
  }

  destroy() {
    ipcMain.off("WINDOW_TOGGLE_MAXIMIZE", this.handleToggleMaximize);
    ipcMain.off("WINDOW_MINIMIZE", this.handleMinimize);
    ipcMain.off("WINDOW_CLOSE", this.handleClose);
  }

  private handleToggleMaximize = (_: Electron.IpcMainEvent) =>
    this.toggleMaximize();

  private handleMinimize = (_: Electron.IpcMainEvent) => this.minimize();

  private handleClose = (_: Electron.IpcMainEvent) => this.close();

  toggleMaximize() {
    if (this.window.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window.maximize();
    }
  }

  minimize() {
    this.window.minimize();
  }

  close() {
    this.window.close();
  }
}
