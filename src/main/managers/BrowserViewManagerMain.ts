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

    ipcMain.on("browserViewStreamStart", () => {
      const stream = new PassThrough();
      this._outputStream = stream;
      this.emit("streamStart", stream);
    });

    ipcMain.on("browserViewStreamData", async (_, data: Uint8Array) => {
      this._outputStream?.write(Buffer.from(data));
    });

    ipcMain.on("browserViewStreamEnd", () => {
      this._outputStream?.end();
      this._outputStream = undefined;
      this.emit("streamEnd");
    });

    ipcMain.on(
      "createBrowserView",
      (
        event,
        url: string,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        event.returnValue = this.createBrowserView(url, x, y, width, height);
      }
    );
    ipcMain.on("removeBrowserView", (_, id: number) =>
      this.removeBrowserView(id)
    );
    ipcMain.on("removeAllBrowserViews", () => this.removeAllBrowserViews());
    ipcMain.on("loadURL", (_, id: number, url: string) =>
      this.loadURL(id, url)
    );
    ipcMain.on("goForward", (_, id: number) => this.goForward(id));
    ipcMain.on("goBack", (_, id: number) => this.goBack(id));
    ipcMain.on("reload", (_, id: number) => this.reload(id));
  }

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
