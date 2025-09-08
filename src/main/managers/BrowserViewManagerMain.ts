import { BrowserWindow, ipcMain, shell, WebContentsView } from "electron";
import { getUserAgent } from "../userAgent";

/**
 * Manager to help create and manager browser views
 * This class is to be run on the main thread
 * For the render thread counterpart see `BrowserViewManagerPreload.ts`
 */
export class BrowserViewManagerMain {
  window: BrowserWindow;
  views: Record<number, WebContentsView>;
  topView: WebContentsView;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.views = {};

    ipcMain.on(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      this.handleCreateBrowserView,
    );
    ipcMain.on(
      "BROWSER_VIEW_REMOVE_BROWSER_VIEW",
      this.handleRemoveBrowserView,
    );
    ipcMain.on(
      "BROWSER_VIEW_REMOVE_ALL_BROWSER_VIEWS",
      this.handleRemoveAllBrowserViews,
    );
    ipcMain.on("BROWSER_VIEW_HIDE_BROWSER_VIEW", this.handleHideBrowserView);
    ipcMain.on("BROWSER_VIEW_SHOW_BROWSER_VIEW", this.handleShowBrowserView);
    ipcMain.on(
      "BROWSER_VIEW_SET_BROWSER_VIEW_BOUNDS",
      this.handleSetBrowserViewBounds,
    );
    ipcMain.on("BROWSER_VIEW_LOAD_URL", this.handleLoadURL);
    ipcMain.on("BROWSER_VIEW_GO_FORWARD", this.handleGoForward);
    ipcMain.on("BROWSER_VIEW_GO_BACK", this.handleGoBack);
    ipcMain.on("BROWSER_VIEW_RELOAD", this.handleReload);

    this.window.on("resize", this.resizeListener);
  }

  destroy() {
    ipcMain.off(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      this.handleCreateBrowserView,
    );
    ipcMain.off(
      "BROWSER_VIEW_REMOVE_BROWSER_VIEW",
      this.handleRemoveBrowserView,
    );
    ipcMain.off(
      "BROWSER_VIEW_REMOVE_ALL_BROWSER_VIEWS",
      this.handleRemoveAllBrowserViews,
    );
    ipcMain.off("BROWSER_VIEW_HIDE_BROWSER_VIEW", this.handleHideBrowserView);
    ipcMain.off("BROWSER_VIEW_SHOW_BROWSER_VIEW", this.handleShowBrowserView);
    ipcMain.off(
      "BROWSER_VIEW_SET_BROWSER_VIEW_BOUNDS",
      this.handleSetBrowserViewBounds,
    );
    ipcMain.off("BROWSER_VIEW_LOAD_URL", this.handleLoadURL);
    ipcMain.off("BROWSER_VIEW_GO_FORWARD", this.handleGoForward);
    ipcMain.off("BROWSER_VIEW_GO_BACK", this.handleGoBack);
    ipcMain.off("BROWSER_VIEW_RELOAD", this.handleReload);

    this.window.off("resize", this.resizeListener);
    this.removeAllBrowserViews();
  }

  private resizeListener = () => {
    if (!this.window || !this.topView) {
      return;
    }
    const bounds = this.window.getBounds();
    const viewBounds = this.topView.getBounds();

    this.topView.setBounds({
      x: viewBounds.x,
      y: viewBounds.y,
      width: bounds.width - viewBounds.x,
      height: bounds.height - viewBounds.y,
    });
  };

  private handleCreateBrowserView = (
    event: Electron.IpcMainEvent,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    preload?: string,
  ) => {
    const id = this.createBrowserView(url, x, y, width, height, preload);
    this.views[id].webContents.on(
      "did-start-navigation",
      (_, url, __, isMainFrame) => {
        if (isMainFrame) {
          event.reply("BROWSER_VIEW_DID_NAVIGATE", id, url);
        }
      },
    );
    this.views[id].webContents.on("page-title-updated", (_, title) => {
      event.reply("BROWSER_VIEW_TITLE_UPDATED", id, title);
    });
    this.views[id].webContents.on("page-favicon-updated", (_, favicons) => {
      event.reply("BROWSER_VIEW_FAVICON_UPDATED", id, favicons);
    });
    this.views[id].webContents.on("media-started-playing", () => {
      event.reply("BROWSER_VIEW_MEDIA_STARTED_PLAYING", id);
    });
    this.views[id].webContents.on("media-paused", () => {
      event.reply("BROWSER_VIEW_MEDIA_PAUSED", id);
    });
    this.views[id].webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    let loaded = false;
    this.views[id].webContents.on("did-finish-load", () => {
      if (!loaded) {
        event.reply("BROWSER_VIEW_LOADED", id);
        loaded = true;
      }
    });

    event.returnValue = id;
  };

  private handleRemoveBrowserView = (_: Electron.IpcMainEvent, id: number) =>
    this.removeBrowserView(id);

  private handleRemoveAllBrowserViews = () => this.removeAllBrowserViews();

  private handleHideBrowserView = (_: Electron.IpcMainEvent, id: number) =>
    this.hideBrowserView(id);

  private handleShowBrowserView = (_: Electron.IpcMainEvent, id: number) =>
    this.showBrowserView(id);

  private handleSetBrowserViewBounds = (
    _: Electron.IpcMainEvent,
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => this.setBrowserViewBounds(id, x, y, width, height);

  private handleLoadURL = (_: Electron.IpcMainEvent, id: number, url: string) =>
    this.loadURL(id, url);

  private handleGoForward = (_: Electron.IpcMainEvent, id: number) =>
    this.goForward(id);

  private handleGoBack = (_: Electron.IpcMainEvent, id: number) =>
    this.goBack(id);

  private handleReload = (_: Electron.IpcMainEvent, id: number) =>
    this.reload(id);

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
    height: number,
    preload?: string,
  ): number {
    const view = new WebContentsView({
      webPreferences: {
        preload,
      },
    });
    this.window.contentView.addChildView(view);

    view.setBounds({
      x,
      y,
      width,
      height,
    });

    try {
      view.webContents.loadURL(url);
    } catch (err) {
      console.error(err);
    }

    // Ensure browser views have a white background to maintain compatibility with regular browsers
    view.webContents.on("dom-ready", () => {
      view.webContents.insertCSS("html { background-color: #fff; }");
    });

    // Spoof user agent to fix compatibility issues with 3rd party apps
    view.webContents.setUserAgent(getUserAgent());

    this.views[view.webContents.id] = view;
    this.topView = view;

    return view.webContents.id;
  }

  removeBrowserView(id: number) {
    if (this.views[id]) {
      if (this.topView === this.views[id]) {
        this.topView = undefined;
      }
      this.views[id].webContents.close({ waitForBeforeUnload: false });
      this.window.contentView.removeChildView(this.views[id]);
      (this.views[id].webContents as any).destroy();
      delete this.views[id];
    }
  }

  removeAllBrowserViews() {
    for (let id in this.views) {
      this.views[id].webContents.close({ waitForBeforeUnload: false });
      this.window.contentView.removeChildView(this.views[id]);
      (this.views[id].webContents as any).destroy();
      this.topView = undefined;
      delete this.views[id];
    }
  }

  hideBrowserView(id: number) {
    if (this.views[id]) {
      if (this.topView === this.views[id]) {
        this.topView = undefined;
      }
      this.window.contentView.removeChildView(this.views[id]);
    }
  }

  showBrowserView(id: number) {
    if (this.views[id]) {
      this.window.contentView.addChildView(this.views[id]);
      this.topView = this.views[id];
    }
  }

  setBrowserViewBounds(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    try {
      this.views[id].setBounds({ x, y, width, height });
    } catch (err) {
      console.error(err);
    }
  }

  loadURL(id: number, url: string) {
    try {
      this.views[id].webContents.loadURL(url);
    } catch (err) {
      console.error(err);
    }
  }

  goForward(id: number) {
    try {
      this.views[id].webContents.navigationHistory.goForward();
    } catch (err) {
      console.error(err);
    }
  }

  goBack(id: number) {
    try {
      this.views[id].webContents.navigationHistory.goBack();
    } catch (err) {
      console.error(err);
    }
  }

  reload(id: number) {
    try {
      this.views[id].webContents.reload();
    } catch (err) {
      console.error(err);
    }
  }
}
