import EventEmitter from "events";
import { GatewayEvent, HeartbeatEvent, OpCode } from "./GatewayEvent";
import { WebSocket } from "ws";
import { API_VERSION } from "../constants";
import { User } from "../types/User";
import { GatewayCloseCode } from "./GatewayCloseCode";

export enum ConnectionState {
  Disconnected,
  Connecting,
  Ready,
}

export type ReadyState = {
  user: User;
  resumeGatewayURL: string;
  sessionId: string;
};

/** Does this GatewayEvent have a valid sequence number */
function isSequencedEvent(event: any): event is { s: number } {
  return event.s !== null && typeof event.s === "number";
}

export interface GatewaySocket extends EventEmitter {
  on(
    event: "state",
    listener: (socket: this, state: ConnectionState) => void
  ): this;
  on(
    event: "event",
    listener: (socket: this, event: GatewayEvent) => void
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
    listener: (socket: this, event: GatewayEvent) => void
  ): this;
  off(event: "open", listener: (socket: this) => void): this;
  off(event: "close", listener: (socket: this, code: number) => void): this;
  off(event: "error", listener: (socket: this, error: Error) => void): this;

  emit(event: "state", socket: this, state: ConnectionState): boolean;
  emit(event: "event", socket: this, gatewayEvent: GatewayEvent): boolean;
  emit(event: "open", socket: this): boolean;
  emit(event: "close", socket: this, code: number): boolean;
  emit(event: "error", socket: this, error: Error): boolean;
}

/**
 * The GatewaySocket holds a single connection to the Discord endpoint
 * It will handle the initial ready event and sending heartbeats
 */
export class GatewaySocket extends EventEmitter {
  private ws: WebSocket;
  connectionState: ConnectionState;
  readyState?: ReadyState;
  /** The last sequence number from a OpCode 0 Dispatch event */
  sequence: number | null;
  /** The current heartbeat timer */
  private heartbeat?: NodeJS.Timeout | NodeJS.Timer;
  /** Has the last heartbeat been acknowledged */
  private acknowledged: boolean;

  constructor(url: string) {
    super();
    this.connectionState = ConnectionState.Connecting;
    this.acknowledged = false;
    this.sequence = null;

    console.log("connect to", url);
    this.ws = new WebSocket(`${url}/?v=${API_VERSION}&encoding=json`);
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

  send(event: GatewayEvent) {
    this.ws.send(JSON.stringify(event));
  }

  private handleSocketOpen = () => {
    this.emit("open", this);
  };

  private handleSocketError = (error: Error) => {
    console.error(error);
    this.emit("error", this, error);
  };

  private handleSocketClose = (code: number) => {
    console.warn("close", code);
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
    const event = JSON.parse(message) as GatewayEvent;
    console.log(event);

    if (isSequencedEvent(event)) {
      this.sequence = event.s;
    }

    if (event.op === OpCode.Dispatch) {
      if (event.t === "READY") {
        this.connectionState = ConnectionState.Ready;
        this.readyState = {
          resumeGatewayURL: event.d.resume_gateway_url,
          sessionId: event.d.session_id,
          user: event.d.user,
        };
      }
    } else if (event.op === OpCode.Hello) {
      this.acknowledged = true;
      this.startHeartbeat(event.d.heartbeat_interval);
    } else if (event.op === OpCode.HeartbeatAck) {
      this.acknowledged = true;
    } else if (event.op === OpCode.Heartbeat) {
      this.sendHeartbeat();
    }

    this.emit("event", this, event);
  };

  /**
   * Start a new heartbeat with a jitter.
   * If the previous heartbeat is not acknowledged by Discord in time
   * the WebSocket will close with code `GatewayCloseCode.HeartbeatNotAcknowledged`
   * @link https://discord.com/developers/docs/topics/gateway#sending-heartbeats
   * @param interval Heartbeat interval in ms
   */
  private startHeartbeat(interval: number) {
    this.stopHeartbeat();
    const jitter = Math.random();
    console.log(
      `heartbeat started at interval: ${interval}ms, with jitter ${jitter}`
    );
    this.heartbeat = setTimeout(() => {
      // Send initial heartbeat
      this.sendHeartbeat();
      this.acknowledged = false;

      // Start heartbeat interval
      this.heartbeat = setInterval(() => {
        if (!this.acknowledged) {
          this.ws.close(
            GatewayCloseCode.HeartbeatNotAcknowledged,
            "Heartbeat was not acknowledged in time"
          );
          return;
        }
        this.sendHeartbeat();
        this.acknowledged = false;
      }, interval);
    }, Math.floor(interval * jitter));
  }

  /** Stop the heartbeat if there is one */
  private stopHeartbeat() {
    if (this.heartbeat) {
      console.log("heartbeat stopped");
      clearTimeout(this.heartbeat);
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }

  /** Send a heartbeat if the WebSocket is open */
  private sendHeartbeat() {
    if (this.ws.readyState === this.ws.OPEN) {
      console.log("heartbeat", this.sequence);
      const event: HeartbeatEvent = {
        op: OpCode.Heartbeat,
        d: this.sequence,
      };
      this.ws.send(JSON.stringify(event));
    }
  }
}
