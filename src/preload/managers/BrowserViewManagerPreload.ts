import { ipcRenderer } from "electron";

/**
 * Manager to help create and manager browser views
 * This class is to be run on the renderer thread
 * For the main thread counterpart see `BrowserViewManagerMain.ts`
 */
export class BrowserViewManagerPreload {
  async createBrowserView(
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    preload?: string
  ): Promise<number> {
    const viewId = ipcRenderer.sendSync(
      "BROWSER_VIEW_CREATE_BROWSER_VIEW",
      url,
      x,
      y,
      width,
      height,
      preload
    );
    return viewId;
  }

  removeBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_REMOVE_BROWSER_VIEW", id);
  }

  hideBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_HIDE_BROWSER_VIEW", id);
  }

  showBrowserView(id: number) {
    ipcRenderer.send("BROWSER_VIEW_SHOW_BROWSER_VIEW", id);
  }

  setBrowserViewBounds(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    ipcRenderer.send(
      "BROWSER_VIEW_SET_BROWSER_VIEW_BOUNDS",
      id,
      x,
      y,
      width,
      height
    );
  }

  loadURL(id: number, url: string) {
    ipcRenderer.send("BROWSER_VIEW_LOAD_URL", id, url);
  }

  goForward(id: number) {
    ipcRenderer.send("BROWSER_VIEW_GO_FORWARD", id);
  }

  goBack(id: number) {
    ipcRenderer.send("BROWSER_VIEW_GO_BACK", id);
  }

  reload(id: number) {
    ipcRenderer.send("BROWSER_VIEW_RELOAD", id);
  }

  /** Maximize the main window */
  toggleMaximize() {
    ipcRenderer.send("BROWSER_VIEW_TOGGLE_MAXIMIZE");
  }

  /** Minimize the main window */
  minimize() {
    ipcRenderer.send("BROWSER_VIEW_MINIMIZE");
  }

  /** Close the main window */
  close() {
    ipcRenderer.send("BROWSER_VIEW_CLOSE");
  }
}
