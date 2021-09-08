import { BrowserView, BrowserWindow, ipcMain } from 'electron';
import { PassThrough } from 'stream';

/**
 * Manager to help create and manager browser views
 * This class is to be run on the main thread
 * For the render thread counterpart see `BrowserViewManagerRenderer.ts`
 */
export class BrowserViewManagerMain {
  window: BrowserWindow;
  views: Record<number, BrowserView>;
  outputStream: PassThrough;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.views = {};
    this.outputStream = new PassThrough();

    ipcMain.on('browserViewStream', async (_, data: ArrayBuffer) => {
      this.outputStream.write(Buffer.from(data));
    });

    ipcMain.on(
      'createBrowserView',
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
    ipcMain.on('removeBrowserView', (_, id: number) =>
      this.removeBrowserView(id)
    );
    ipcMain.on('loadURL', (_, id: number, url: string) =>
      this.loadURL(id, url)
    );
    ipcMain.on('goForward', (_, id: number) => this.goForward(id));
    ipcMain.on('goBack', (_, id: number) => this.goBack(id));
    ipcMain.on('reload', (_, id: number) => this.reload(id));
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
