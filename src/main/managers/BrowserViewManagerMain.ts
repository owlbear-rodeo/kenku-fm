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

    ipcMain.on("BROWSER_VIEW_STREAM_START", this._handleBrowserViewStreamStart);
    ipcMain.on("BROWSER_VIEW_STREAM_DATA", this._handleBrowserViewStreamData);
    ipcMain.on("BROWSER_VIEW_STREAM_END", this._handleBrowserViewStreamEnd);
    ipcMain.on(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      this._handleCreateBrowserView
    );
    ipcMain.on(
      "BROWSER_VIEW_REMOVE_BROWSER_VIEW",
      this._handleRemoveBrowserView
    );
    ipcMain.on(
      "BROWSER_VIEW_REMOVE_ALL_BROWSER_VIEWS",
      this._handleRemoveAllBrowserViews
    );
    ipcMain.handle(
      "BROWSER_VIEW_GET_MEDIA_SOURCE_ID",
      this._handleGetMediaSourceId
    );
    ipcMain.on("BROWSER_VIEW_LOAD_URL", this._handleLoadURL);
    ipcMain.on("BROWSER_VIEW_GO_FORWARD", this._handleGoForward);
    ipcMain.on("BROWSER_VIEW_GO_BACK", this._handleGoBack);
    ipcMain.on("BROWSER_VIEW_RELOAD", this._handleReload);
  }

  destroy() {
    ipcMain.off(
      "BROWSER_VIEW_STREAM_START",
      this._handleBrowserViewStreamStart
    );
    ipcMain.off("BROWSER_VIEW_STREAM_DATA", this._handleBrowserViewStreamData);
    ipcMain.off("BROWSER_VIEW_STREAM_END", this._handleBrowserViewStreamEnd);
    ipcMain.off(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      this._handleCreateBrowserView
    );
    ipcMain.off(
      "BROWSER_VIEW_REMOVE_BROWSER_VIEW",
      this._handleRemoveBrowserView
    );
    ipcMain.off(
      "BROWSER_VIEW_REMOVE_ALL_BROWSER_VIEWS",
      this._handleRemoveAllBrowserViews
    );
    ipcMain.removeHandler("BROWSER_VIEW_GET_MEDIA_SOURCE_ID");
    ipcMain.off("BROWSER_VIEW_LOAD_URL", this._handleLoadURL);
    ipcMain.off("BROWSER_VIEW_GO_FORWARD", this._handleGoForward);
    ipcMain.off("BROWSER_VIEW_GO_BACK", this._handleGoBack);
    ipcMain.off("BROWSER_VIEW_RELOAD", this._handleReload);
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
    const id = this.createBrowserView(url, x, y, width, height);
    this.views[id].webContents.on(
      "did-start-navigation",
      (_, url, __, isMainFrame) => {
        if (isMainFrame) {
          event.reply("BROWSER_VIEW_DID_NAVIGATE", id, url);
        }
      }
    );
    event.returnValue = id;
  };

  _handleRemoveBrowserView = (_: Electron.IpcMainEvent, id: number) =>
    this.removeBrowserView(id);

  _handleRemoveAllBrowserViews = () => this.removeAllBrowserViews();

  _handleGetMediaSourceId = async (
    event: Electron.IpcMainEvent,
    id: number
  ): Promise<string> => {
    if (this.views[id]) {
      return this.views[id].webContents.getMediaSourceId(event.sender);
    }
  };

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
    const view = new BrowserView();
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
