import { Server } from "node-osc";
import { BrowserWindow } from "electron";
import store from "./store";

export default class Remote {
  oscServer: Server | null = null;
  host = store.get("remoteHost");
  port = store.get("remotePort");

  start(callback?: () => void) {
    this.oscServer = new Server(this.port, this.host, callback);

    this.oscServer.on("message", function (msg) {
      if (
        msg.length === 2 &&
        msg[0] === "/open" &&
        typeof msg[1] === "string"
      ) {
        const windows = BrowserWindow.getAllWindows();
        for (let window of windows) {
          window.webContents.send("REMOTE_OPEN_URL", msg[1]);
        }
      }
    });

    const windows = BrowserWindow.getAllWindows();
    for (let window of windows) {
      window.webContents.send("REMOTE_ENABLED", true);
    }
  }

  stop() {
    if (this.oscServer) {
      this.oscServer.close();
      this.oscServer = null;

      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("REMOTE_ENABLED", false);
      }
    }
  }

  getInfo() {
    return `Running: ${this.oscServer !== null}\nHost: ${this.host}\nPort: ${
      this.port
    }`;
  }
}
