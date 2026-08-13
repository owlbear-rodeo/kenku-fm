import { BrowserWindow, ipcMain } from "electron";

export class WindowManager {
  window: BrowserWindow;
  constructor(window: BrowserWindow) {
    this.window = window;
    ipcMain.on("WINDOW_TOGGLE_MAXIMIZE", this._handleToggleMaximize);
    ipcMain.on("WINDOW_MINIMIZE", this._handleMinimize);
    ipcMain.on("WINDOW_CLOSE", this._handleClose);
  }

  destroy() {
    ipcMain.off("WINDOW_TOGGLE_MAXIMIZE", this._handleToggleMaximize);
    ipcMain.off("WINDOW_MINIMIZE", this._handleMinimize);
    ipcMain.off("WINDOW_CLOSE", this._handleClose);
  }

  _handleToggleMaximize = () => this.toggleMaximize();

  _handleMinimize = () => this.minimize();

  _handleClose = () => this.close();

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
