import log from "electron-log/main";
import { TypedEmitter } from "tiny-typed-emitter";
import severus, { RTCClient } from "severus";
import { BrowserView, BrowserWindow, ipcMain } from "electron";

export interface RTCManagerEvents {
  start: (rtc: RTCClient) => void;
}

export class RTCManager extends TypedEmitter<RTCManagerEvents> {
  private browserView: BrowserView;
  rtc?: RTCClient;
  streaming = false;

  constructor(browserView: BrowserView) {
    super();
    this.browserView = browserView;
    ipcMain.handle(
      "AUDIO_CAPTURE_RTC_CREATE_CONNECTION",
      this.handleRTCCreateConnection
    );
    ipcMain.handle("AUDIO_CAPTURE_RTC_SIGNAL", this.handleRTCSignal);
    ipcMain.handle(
      "AUDIO_CAPTURE_RTC_ADD_CANDIDATE",
      this.handleRTCAddCandidate
    );
    ipcMain.handle("AUDIO_CAPTURE_RTC_START_STREAM", this.handleRTCStartStream);
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

      this.rtc = await severus.rtcNew();
      severus.rtcOnCandidate(this.rtc, (candidate) => {
        this.browserView.webContents.send(
          "AUDIO_CAPTURE_RTC_CANDIDATE",
          candidate
        );
      });
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

  private handleRTCStartStream = async (_: Electron.IpcMainEvent) => {
    try {
      this.streaming = true;
      this.emit("start", this.rtc);
      await severus.rtcStartStream(this.rtc);
      this.streaming = false;
    } catch (err) {
      log.error("unable to start RTC stream", err.message);
      const windows = BrowserWindow.getAllWindows();
      for (let window of windows) {
        window.webContents.send("ERROR", err.message);
      }
    }
  };
}
