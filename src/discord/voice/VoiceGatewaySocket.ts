import log from "electron-log/main";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  VoiceGatewayEvent,
  HeartbeatEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import { WebSocket } from "ws";
import { VOICE_API_VERSION } from "../constants";
import { VoiceGatewayCloseCode } from "./VoiceGatewayCloseCode";

export interface VoiceGatewaySocketEvents {
  event: (socket: VoiceGatewaySocket, event: VoiceGatewayEvent) => void;
  open: (socket: VoiceGatewaySocket) => void;
  close: (socket: VoiceGatewaySocket, code: number) => void;
}

/**
 * The GatewaySocket holds a single connection to the Discord endpoint
 * It will handle the initial ready event and sending heartbeats
 */
export class VoiceGatewaySocket extends TypedEmitter<VoiceGatewaySocketEvents> {
  private ws: WebSocket;
  /** The current heartbeat timer */
  private heartbeat?: NodeJS.Timeout;
  /** Has the last heartbeat been acknowledged */
  private acknowledged: boolean;
  private sessionId: string;

  constructor(endpoint: string, sessionId: string) {
    super();
    this.acknowledged = false;
    this.sessionId = sessionId;

    log.debug(`voice gateway socket ${sessionId} connecting to`, endpoint);
    this.ws = new WebSocket(`wss://${endpoint}/?v=${VOICE_API_VERSION}`);
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
    this.emit("open", this);
  };

  private handleSocketError = (error: Error) => {
    log.error(`voice gateway ${this.sessionId} socket error:`, error);
  };

  private handleSocketClose = (code: number) => {
    log.warn(`voice gateway socket ${this.sessionId} closed with code:`, code);
    this.ws.off("open", this.handleSocketOpen);
    this.ws.off("error", this.handleSocketError);
    this.ws.off("close", this.handleSocketClose);
    this.ws.off("message", this.handleSocketMessage);
    this.stopHeartbeat();
    this.emit("close", this, code);
  };

  private handleSocketMessage = (message: string) => {
    const event = JSON.parse(message) as VoiceGatewayEvent;
    log.debug(`voice gateway socket ${this.sessionId} event`, event.op);

    if (event.op === VoiceOpCode.Hello) {
      this.acknowledged = true;
      this.startHeartbeat(event.d.heartbeat_interval);
    } else if (event.op === VoiceOpCode.HeartbeatAck) {
      this.acknowledged = true;
    } else if (event.op === VoiceOpCode.Heartbeat) {
      this.sendHeartbeat();
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
      `voice gateway socket ${this.sessionId} heartbeat started at interval: ${interval}ms, with jitter ${jitter}`
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
      log.debug(`voice gateway socket ${this.sessionId} heartbeat stopped`);
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }

  /** Send a heartbeat if the WebSocket is open */
  private sendHeartbeat() {
    if (this.ws.readyState === this.ws.OPEN) {
      const nonce = Date.now();
      log.debug(`voice gateway socket ${this.sessionId} heartbeat`, nonce);
      const event: HeartbeatEvent = {
        op: VoiceOpCode.Heartbeat,
        d: nonce,
      };
      this.ws.send(JSON.stringify(event));
    }
  }
}
