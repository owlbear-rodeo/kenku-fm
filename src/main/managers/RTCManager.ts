import log from "electron-log/main";
import { TypedEmitter } from "tiny-typed-emitter";
import severus, { Broadcast, RTCClient } from "severus";
import { BrowserView, BrowserWindow, ipcMain } from "electron";

export interface RTCManagerEvents {
  create: (rtc: RTCClient) => void;
}

export class RTCManager extends TypedEmitter<RTCManagerEvents> {
  private browserView: BrowserView;
  private broadcast: Broadcast;
  rtc?: RTCClient;

  constructor(browserView: BrowserView, broadcast: Broadcast) {
    super();
    this.browserView = browserView;
    this.broadcast = broadcast;
    ipcMain.handle(
      "AUDIO_CAPTURE_RTC_CREATE_CONNECTION",
      this.handleRTCCreateConnection
    );
    ipcMain.handle("AUDIO_CAPTURE_RTC_SIGNAL", this.handleRTCSignal);
    ipcMain.handle(
      "AUDIO_CAPTURE_RTC_ADD_CANDIDATE",
      this.handleRTCAddCandidate
    );
  }

  destroy() {
    ipcMain.removeHandler("AUDIO_CAPTURE_RTC_CREATE_CONNECTION");
    ipcMain.removeHandler("AUDIO_CAPTURE_RTC_SIGNAL");
    ipcMain.removeHandler("AUDIO_CAPTURE_RTC_ADD_CANDIDATE");
    ipcMain.removeHandler("AUDIO_CAPTURE_RTC_START_STREAM");
    if (this.rtc) {
      severus.rtcClose(this.rtc).catch((err) => {
        log.debug("rtc close error", err.message);
      });
    }
    this.broadcast = undefined;
  }

  createClientIfNeeded() {
    if (!this.rtc) {
      this.browserView.webContents.send("AUDIO_CAPTURE_START_RTC");
    }
  }

  stopAndRemoveClient() {
    if (this.rtc) {
      this.browserView.webContents.send("AUDIO_CAPTURE_STOP_RTC");
      severus.rtcClose(this.rtc).catch((err) => {
        log.debug("rtc close error", err.message);
      });
      this.rtc = undefined;
    }
  }

  private handleRTCCreateConnection = async (_: Electron.IpcMainEvent) => {
    try {
      if (this.rtc) {
        try {
          await severus.rtcClose(this.rtc);
        } catch (err) {
          log.debug("rtc close error", err.message);
        }
        this.rtc = undefined;
      }

      const rtc = await severus.rtcNew(this.broadcast);
      this.rtc = rtc;
      severus.rtcOnCandidate(rtc, (candidate) => {
        if (this.rtc === rtc) {
          this.browserView.webContents.send(
            "AUDIO_CAPTURE_RTC_CANDIDATE",
            candidate
          );
        }
      });
      severus.rtcOnClose(rtc, () => {
        if (this.rtc === rtc) {
          this.browserView.webContents.send("AUDIO_CAPTURE_RTC_CLOSE");
        }
      });

      this.emit("create", rtc);
    } catch (err) {
      log.error("unable to start RTC", err.message);
      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("ERROR", err.message);
      }
    }
  };

  private handleRTCSignal = async (_: Electron.IpcMainEvent, offer: string) => {
    try {
      return await severus.rtcSignal(this.rtc, offer);
    } catch (err) {
      log.error("unable to send RTC signal", err.message);
      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("ERROR", err.message);
      }
    }
  };

  private handleRTCAddCandidate = async (
    _: Electron.IpcMainEvent,
    candidate: string
  ) => {
    try {
      return await severus.rtcAddCandidate(this.rtc, candidate);
    } catch (err) {
      log.error("unable to send RTC candidate", err.message);
      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("ERROR", err.message);
      }
    }
  };
}
