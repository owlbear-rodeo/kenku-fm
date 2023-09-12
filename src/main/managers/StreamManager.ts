import log from "electron-log/main";
import severus, { Broadcast, Stream } from "severus";
import { BrowserView } from "electron";

export class StreamManager {
  private browserView: BrowserView;
  private broadcast: Broadcast;
  stream?: Stream;

  constructor(browserView: BrowserView, broadcast: Broadcast) {
    this.browserView = browserView;
    this.broadcast = broadcast;
  }

  destroy() {
    if (this.stream) {
      severus.streamStop(this.stream);
    }
    this.broadcast = undefined;
  }

  async createClientIfNeeded() {
    if (!this.stream) {
      this.stream = await severus.streamNew(this.broadcast);
      const port = severus.streamGetPort(this.stream);
      log.debug("starting udp stream on port", port);
      this.browserView.webContents.send("AUDIO_CAPTURE_START_STREAM", port);
    }
  }

  stopAndRemoveClient() {
    if (this.stream) {
      this.browserView.webContents.send("AUDIO_CAPTURE_STOP_STREAM");
      severus.streamStop(this.stream);
      this.stream = undefined;
    }
  }
}
