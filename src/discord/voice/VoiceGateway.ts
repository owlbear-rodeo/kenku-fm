import log from "electron-log/main";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  VoiceGatewayCloseCode,
  shouldResumeAfterClose,
} from "./VoiceGatewayCloseCode";
import {
  IdentifyEvent,
  ReadyEvent,
  ResumeEvent,
  SessionDescriptionEvent,
  VoiceGatewayEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import { VoiceGatewaySocket } from "./VoiceGatewaySocket";
import { reconnectAfterMs } from "../../backoff";
import { Gateway, GatewayConnectionState } from "../gateway/Gateway";

export enum VoiceGatewayConnectionState {
  Disconnected,
  Connecting,
  Ready,
}

export interface VoiceGatewayDescription {
  token: string;
  guildId: string;
  endpoint: string;
  sessionId: string;
  userId: string;
}

export interface VoiceGatewayEvents {
  error: (error: Error) => void;
  ready: (data: ReadyEvent["d"]) => void;
  session: (data: SessionDescriptionEvent["d"]) => void;
  state: (state: VoiceGatewayConnectionState) => void;
}

export class VoiceGateway extends TypedEmitter<VoiceGatewayEvents> {
  private gateway: Gateway;
  private description: VoiceGatewayDescription;
  private socket?: VoiceGatewaySocket;
  /** Has this gateway connected before, if true send the resume event */
  private hasConnected: boolean;
  private reconnectTries = 0;
  private _connectionState: VoiceGatewayConnectionState;
  get connectionState() {
    return this._connectionState;
  }
  private set connectionState(state) {
    // Don't trigger the change event if the state is the same
    if (this._connectionState === state) {
      return;
    } else {
      this._connectionState = state;
      this.emit("state", state);
    }
  }
  ssrc?: number;

  constructor(gateway: Gateway, description: VoiceGatewayDescription) {
    super();
    this.gateway = gateway;
    this.description = description;
    this.hasConnected = false;
    this._connectionState = VoiceGatewayConnectionState.Disconnected;
    this.connect();
  }

  private connect() {
    if (this.socket) {
      this.socket.close(VoiceGatewayCloseCode.Reconnecting);
      this.socket = undefined;
    }

    this.connectionState = VoiceGatewayConnectionState.Connecting;

    this.socket = new VoiceGatewaySocket(this.description.endpoint);
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
    this.connectionState = VoiceGatewayConnectionState.Disconnected;
  }

  private handleSocketOpen = (socket: VoiceGatewaySocket) => {
    if (this.hasConnected) {
      log.debug("voice gateway resume");
      const resume: ResumeEvent = {
        op: VoiceOpCode.Resume,
        d: {
          server_id: this.description.guildId,
          session_id: this.description.sessionId,
          token: this.description.token,
        },
      };
      socket.send(resume);
    } else {
      log.debug("voice gateway identify");
      const identify: IdentifyEvent = {
        op: VoiceOpCode.Identify,
        d: {
          server_id: this.description.guildId,
          session_id: this.description.sessionId,
          token: this.description.token,
          user_id: this.description.userId,
        },
      };
      socket.send(identify);
    }
  };

  private handleSocketClose = (socket: VoiceGatewaySocket, code: number) => {
    socket.off("open", this.handleSocketOpen);
    socket.off("close", this.handleSocketClose);
    socket.off("event", this.handleSocketEvent);

    if (this.socket) {
      this.socket = undefined;
    }

    if (shouldResumeAfterClose(code)) {
      if (this.gateway.connectionState !== GatewayConnectionState.Ready) {
        log.debug("voice gateway reconnecting once gateway is ready");
        const tryReconnect = (state: GatewayConnectionState) => {
          if (state === GatewayConnectionState.Ready) {
            this.gateway.off("state", tryReconnect);
            if (!this.socket) {
              log.debug(
                "gateway ready: voice gateway reconnecting with code:",
                code
              );
              this.connect();
            }
          }
        };
        this.gateway.on("state", tryReconnect);
      } else {
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
      }
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
      this.reconnectTries = 0;
      this.connectionState = VoiceGatewayConnectionState.Ready;
      if (!this.hasConnected) {
        this.emit("ready", event.d);
      }
      this.hasConnected = true;
    } else if (event.op === VoiceOpCode.SessionDescription) {
      this.emit("session", event.d);
    }
  };

  send(event: VoiceGatewayEvent) {
    this.socket?.send(event);
  }
}
