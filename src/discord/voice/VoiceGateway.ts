import EventEmitter from "events";
import log from "electron-log/main";
import {
  VoiceGatewayCloseCode,
  shouldResumeAfterClose,
} from "./VoiceGatewayCloseCode";
import {
  ReadyEvent,
  ResumeEvent,
  SessionDescriptionEvent,
  VoiceGatewayEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import {
  VoiceGatewaySocket,
  VoiceSocketDescription,
} from "./VoiceGatewaySocket";
import { reconnectAfterMs } from "../../backoff";

export interface VoiceGateway extends EventEmitter {
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "ready", listener: (data: ReadyEvent["d"]) => void): this;
  on(
    event: "session",
    listener: (data: SessionDescriptionEvent["d"]) => void
  ): this;

  off(event: "error", listener: (error: Error) => void): this;
  off(event: "ready", listener: (data: ReadyEvent["d"]) => void): this;
  off(
    event: "session",
    listener: (data: SessionDescriptionEvent["d"]) => void
  ): this;

  emit(event: "error", error: Error): boolean;
  emit(event: "ready", data: ReadyEvent["d"]): boolean;
  emit(event: "session", data: SessionDescriptionEvent["d"]): boolean;
}

export class VoiceGateway extends EventEmitter {
  private description: VoiceSocketDescription;
  socket?: VoiceGatewaySocket;
  /** Has this gateway connected before, if true send the resume event */
  private hasConnected: boolean;
  private reconnectTries = 0;
  ssrc?: number;

  constructor(description: VoiceSocketDescription) {
    super();
    this.description = description;
    this.hasConnected = false;
    this.connect();
  }

  private connect() {
    if (this.socket) {
      this.socket.close(VoiceGatewayCloseCode.Reconnecting);
      this.socket = undefined;
    }

    this.socket = new VoiceGatewaySocket(this.description);
    this.socket.on("open", this.handleSocketOpen);
    this.socket.on("close", this.handleSocketClose);
    this.socket.on("event", this.handleSocketEvent);
  }

  disconnect() {
    if (this.socket) {
      log.debug("voice gateway manual disconnect");
      this.socket.close(VoiceGatewayCloseCode.NormalClosure);
      this.socket = undefined;
    }
    this.reconnectTries = 0;
  }

  private handleSocketOpen = (socket: VoiceGatewaySocket) => {
    if (this.hasConnected) {
      const resume: ResumeEvent = {
        op: VoiceOpCode.Resume,
        d: {
          server_id: this.description.guildId,
          session_id: this.description.sessionId,
          token: this.description.token,
        },
      };
      socket.send(resume);
    }
    this.reconnectTries = 0;
  };

  private handleSocketClose = (socket: VoiceGatewaySocket, code: number) => {
    socket.off("open", this.handleSocketOpen);
    socket.off("close", this.handleSocketClose);
    socket.off("event", this.handleSocketEvent);

    if (this.socket) {
      this.socket = undefined;
    }

    if (shouldResumeAfterClose(code)) {
      this.reconnectTries += 1;
      const after = reconnectAfterMs(this.reconnectTries);
      log.debug(
        "voice gateway reconnecting from code",
        code,
        "in",
        after,
        "ms"
      );
      setTimeout(() => {
        // Check to see if we still need to reconnect
        if (!this.socket && this.reconnectTries > 0) {
          log.debug("voice gateway reconnecting with code:", code);
          this.connect();
        } else {
          log.debug("voice gateway reconnect ignored");
        }
      }, after);
    } else if (
      code !== VoiceGatewayCloseCode.Reconnecting &&
      code !== VoiceGatewayCloseCode.NormalClosure
    ) {
      this.emit(
        "error",
        Error(`Voice gateway socket closed with code: ${code}`)
      );
    }
  };

  private handleSocketEvent = (
    _: VoiceGatewaySocket,
    event: VoiceGatewayEvent
  ) => {
    if (event.op === VoiceOpCode.Ready) {
      this.ssrc = event.d.ssrc;
      this.emit("ready", event.d);
    } else if (event.op === VoiceOpCode.SessionDescription) {
      this.emit("session", event.d);
    } else if (event.op === VoiceOpCode.Hello) {
      this.hasConnected = true;
    }
  };
}
