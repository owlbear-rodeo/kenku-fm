import EventEmitter from "events";
import log from "electron-log/main";
import {
  VoiceGatewayEvent,
  HeartbeatEvent,
  VoiceOpCode,
  IdentifyEvent,
} from "./VoiceGatewayEvent";
import { WebSocket } from "ws";
import { VOICE_API_VERSION } from "../constants";
import { VoiceGatewayCloseCode } from "./VoiceGatewayCloseCode";

export enum ConnectionState {
  Disconnected,
  Connecting,
  Ready,
}

export interface VoiceSocketDescription {
  token: string;
  guildId: string;
  endpoint: string;
  sessionId: string;
  userId: string;
}

export interface VoiceGatewaySocket extends EventEmitter {
  on(
    event: "state",
    listener: (socket: this, state: ConnectionState) => void
  ): this;
  on(
    event: "event",
    listener: (socket: this, event: VoiceGatewayEvent) => void
  ): this;
  on(event: "open", listener: (socket: this) => void): this;
  on(event: "close", listener: (socket: this, code: number) => void): this;
  on(event: "error", listener: (socket: this, error: Error) => void): this;

  off(
    event: "state",
    listener: (socket: this, state: ConnectionState) => void
  ): this;
  off(
    event: "event",
    listener: (socket: this, event: VoiceGatewayEvent) => void
  ): this;
  off(event: "open", listener: (socket: this) => void): this;
  off(event: "close", listener: (socket: this, code: number) => void): this;
  off(event: "error", listener: (socket: this, error: Error) => void): this;

  emit(event: "state", socket: this, state: ConnectionState): boolean;
  emit(
    event: "event",
    socket: this,
    voiceGatewayEvent: VoiceGatewayEvent
  ): boolean;
  emit(event: "open", socket: this): boolean;
  emit(event: "close", socket: this, code: number): boolean;
  emit(event: "error", socket: this, error: Error): boolean;
}

/**
 * The GatewaySocket holds a single connection to the Discord endpoint
 * It will handle the initial ready event and sending heartbeats
 */
export class VoiceGatewaySocket extends EventEmitter {
  private ws: WebSocket;
  connectionState: ConnectionState;
  description?: VoiceSocketDescription;
  /** The current heartbeat timer */
  private heartbeat?: NodeJS.Timer;
  /** Has the last heartbeat been acknowledged */
  private acknowledged: boolean;

  constructor(description: VoiceSocketDescription) {
    super();
    this.description = description;
    this.connectionState = ConnectionState.Connecting;
    this.acknowledged = false;

    log.debug("voice gateway socket connecting to", description.endpoint);
    this.ws = new WebSocket(
      `wss://${description.endpoint}/?v=${VOICE_API_VERSION}`
    );
    this.ws.on("open", this.handleSocketOpen);
    this.ws.on("error", this.handleSocketError);
    this.ws.on("close", this.handleSocketClose);
    this.ws.on("message", this.handleSocketMessage);
  }

  close(code: number) {
    if (
      this.ws.readyState === this.ws.CONNECTING ||
      this.ws.readyState === this.ws.OPEN
    ) {
      this.ws.close(code);
    }
  }

  send(event: VoiceGatewayEvent) {
    this.ws.send(JSON.stringify(event));
  }

  private handleSocketOpen = () => {
    const identify: IdentifyEvent = {
      op: VoiceOpCode.Identify,
      d: {
        server_id: this.description.guildId,
        session_id: this.description.sessionId,
        token: this.description.token,
        user_id: this.description.userId,
      },
    };
    log.debug("voice gateway socket identify", identify);
    this.send(identify);
    this.emit("open", this);
  };

  private handleSocketError = (error: Error) => {
    log.error("voice gateway socket error: ", error);
    this.emit("error", this, error);
  };

  private handleSocketClose = (code: number) => {
    log.warn("voice gateway socket closed with code:", code);
    this.connectionState = ConnectionState.Disconnected;
    this.emit("state", this, ConnectionState.Disconnected);
    this.ws.off("open", this.handleSocketOpen);
    this.ws.off("error", this.handleSocketError);
    this.ws.off("close", this.handleSocketClose);
    this.ws.off("message", this.handleSocketMessage);
    this.stopHeartbeat();
    this.emit("close", this, code);
  };

  private handleSocketMessage = (message: string) => {
    const event = JSON.parse(message) as VoiceGatewayEvent;
    log.debug("voice gateway socket event", event);

    if (event.op === VoiceOpCode.Hello) {
      this.acknowledged = true;
      this.startHeartbeat(event.d.heartbeat_interval);
    } else if (event.op === VoiceOpCode.HeartbeatAck) {
      this.acknowledged = true;
    } else if (event.op === VoiceOpCode.Heartbeat) {
      this.sendHeartbeat();
    } else if (event.op === VoiceOpCode.Ready) {
      this.connectionState = ConnectionState.Ready;
      this.emit("state", this, ConnectionState.Ready);
    }

    this.emit("event", this, event);
  };

  /**
   * Start a new heartbeat
   * If the previous heartbeat is not acknowledged by Discord in time
   * the WebSocket will close with code `VoiceGatewayCloseCode.HeartbeatNotAcknowledged`
   * @link https://discord.com/developers/docs/topics/voice-connections#heartbeating-example-heartbeat-payload
   * @param interval Heartbeat interval in ms
   */
  private startHeartbeat(interval: number) {
    this.stopHeartbeat();
    const jitter = Math.random();
    log.debug(
      `voice gateway socket heartbeat started at interval: ${interval}ms, with jitter ${jitter}`
    );
    // Send initial heartbeat
    this.sendHeartbeat();
    this.acknowledged = false;

    // Start heartbeat interval
    this.heartbeat = setInterval(() => {
      if (!this.acknowledged) {
        this.ws.close(
          VoiceGatewayCloseCode.HeartbeatNotAcknowledged,
          "Voice heartbeat was not acknowledged in time"
        );
        return;
      }
      this.sendHeartbeat();
      this.acknowledged = false;
    }, interval);
  }

  /** Stop the heartbeat if there is one */
  private stopHeartbeat() {
    if (this.heartbeat) {
      log.debug("voice gateway socket heartbeat stopped");
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }

  /** Send a heartbeat if the WebSocket is open */
  private sendHeartbeat() {
    if (this.ws.readyState === this.ws.OPEN) {
      const nonce = Date.now();
      log.debug("voice gateway socket heartbeat", nonce);
      const event: HeartbeatEvent = {
        op: VoiceOpCode.Heartbeat,
        d: nonce,
      };
      this.ws.send(JSON.stringify(event));
    }
  }
}
