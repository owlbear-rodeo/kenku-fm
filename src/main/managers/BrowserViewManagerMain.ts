import { BrowserView, BrowserWindow, ipcMain } from "electron";
import { PassThrough } from "stream";
import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";

interface BrowserViewManagerEvents {
  streamStart: (stream: Readable) => void;
  streamEnd: () => void;
}

/**
 * Manager to help create and manager browser views
 * This class is to be run on the main thread
 * For the render thread counterpart see `BrowserViewManagerPreload.ts`
 */
export class BrowserViewManagerMain extends TypedEmitter<BrowserViewManagerEvents> {
  window: BrowserWindow;
  views: Record<number, BrowserView>;
  _outputStream?: PassThrough;

  constructor(window: BrowserWindow) {
    super();
    this.window = window;
    this.views = {};

    ipcMain.on("browserViewStreamStart", this._handleBrowserViewStreamStart);
    ipcMain.on("browserViewStreamData", this._handleBrowserViewStreamData);
    ipcMain.on("browserViewStreamEnd", this._handleBrowserViewStreamEnd);
    ipcMain.on("createBrowserView", this._handleCreateBrowserView);
    ipcMain.on("removeBrowserView", this._handleRemoveBrowserView);
    ipcMain.on("removeAllBrowserViews", this._handleRemoveAllBrowserViews);
    ipcMain.on("loadURL", this._handleLoadURL);
    ipcMain.on("goForward", this._handleGoForward);
    ipcMain.on("goBack", this._handleGoBack);
    ipcMain.on("reload", this._handleReload);
  }

  destroy() {
    ipcMain.off("browserViewStreamStart", this._handleBrowserViewStreamStart);
    ipcMain.off("browserViewStreamData", this._handleBrowserViewStreamData);
    ipcMain.off("browserViewStreamEnd", this._handleBrowserViewStreamEnd);
    ipcMain.off("createBrowserView", this._handleCreateBrowserView);
    ipcMain.off("removeBrowserView", this._handleRemoveBrowserView);
    ipcMain.off("removeAllBrowserViews", this._handleRemoveAllBrowserViews);
    ipcMain.off("loadURL", this._handleLoadURL);
    ipcMain.off("goForward", this._handleGoForward);
    ipcMain.off("goBack", this._handleGoBack);
    ipcMain.off("reload", this._handleReload);
    this._handleBrowserViewStreamEnd();
    this.removeAllBrowserViews();
  }

  _handleBrowserViewStreamStart = () => {
    this._outputStream?.end();
    const stream = new PassThrough();
    this._outputStream = stream;
    this.emit("streamStart", stream);
  };

  _handleBrowserViewStreamData = async (
    _: Electron.IpcMainEvent,
    data: Uint8Array
  ) => {
    this._outputStream?.write(Buffer.from(data));
  };

  _handleBrowserViewStreamEnd = () => {
    this._outputStream?.end();
    this._outputStream = undefined;
    this.emit("streamEnd");
  };

  _handleCreateBrowserView = (
    event: Electron.IpcMainEvent,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    event.returnValue = this.createBrowserView(url, x, y, width, height);
  };

  _handleRemoveBrowserView = (_: Electron.IpcMainEvent, id: number) =>
    this.removeBrowserView(id);

  _handleRemoveAllBrowserViews = () => this.removeAllBrowserViews();

  _handleLoadURL = (_: Electron.IpcMainEvent, id: number, url: string) =>
    this.loadURL(id, url);

  _handleGoForward = (_: Electron.IpcMainEvent, id: number) =>
    this.goForward(id);

  _handleGoBack = (_: Electron.IpcMainEvent, id: number) => this.goBack(id);

  _handleReload = (_: Electron.IpcMainEvent, id: number) => this.reload(id);

  /**
   * Create a new browser view and attach it to the current window
   * @param url Initial URL
   * @param xOffset Offset from the left side of the screen
   * @returns id of the created window
   */
  createBrowserView(
    url: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        worldSafeExecuteJavaScript: true,
      },
    });
    this.window.setBrowserView(view);

    view.setBounds({
      x,
      y,
      width,
      height,
    });
    view.setAutoResize({
      width: true,
      height: true,
      vertical: true,
    });

    try {
      view.webContents.loadURL(url);
    } catch (err) {
      console.error(err);
    }

    this.views[view.webContents.id] = view;

    return view.webContents.id;
  }

  removeBrowserView(id: number) {
    if (this.views[id]) {
      this.window.removeBrowserView(this.views[id]);
      (this.views[id].webContents as any).destroy();
      delete this.views[id];
    }
  }

  removeAllBrowserViews() {
    for (let id in this.views) {
      this.window.removeBrowserView(this.views[id]);
      (this.views[id].webContents as any).destroy();
      delete this.views[id];
    }
  }

  loadURL(id: number, url: string) {
    try {
      this.views[id]?.webContents.loadURL(url);
    } catch (err) {
      console.error(err);
    }
  }

  goForward(id: number) {
    try {
      this.views[id]?.webContents.goForward();
    } catch (err) {
      console.error(err);
    }
  }

  goBack(id: number) {
    try {
      this.views[id]?.webContents.goBack();
    } catch (err) {
      console.error(err);
    }
  }

  reload(id: number) {
    try {
      this.views[id]?.webContents.reload();
    } catch (err) {
      console.error(err);
    }
  }
}
