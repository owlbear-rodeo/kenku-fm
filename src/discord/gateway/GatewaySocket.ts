import { TypedEmitter } from "tiny-typed-emitter";
import log from "electron-log/main";
import { GatewayEvent, HeartbeatEvent, OpCode } from "./GatewayEvent";
import { WebSocket } from "ws";
import { API_VERSION } from "../constants";
import { GatewayCloseCode } from "./GatewayCloseCode";

export interface GatewaySocketEvents {
  event: (socket: GatewaySocket, event: GatewayEvent) => void;
  open: (socket: GatewaySocket) => void;
  close: (socket: GatewaySocket, code: number) => void;
}

/**
 * The GatewaySocket holds a single connection to the Discord endpoint
 * It will handle the initial ready event and sending heartbeats
 */
export class GatewaySocket extends TypedEmitter<GatewaySocketEvents> {
  private ws: WebSocket;
  /** The last sequence number from a OpCode 0 Dispatch event */
  private sequence: number | null;
  /** The current heartbeat timer */
  private heartbeat?: NodeJS.Timeout;
  /** Has the last heartbeat been acknowledged */
  private acknowledged: boolean;

  constructor(url: string) {
    super();
    this.acknowledged = false;

    log.debug("gateway socket connecting to", url);
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
    log.error("gateway socket error:", error);
  };

  private handleSocketClose = (code: number) => {
    log.warn("gateway socket closed with code:", code);
    this.ws.off("open", this.handleSocketOpen);
    this.ws.off("error", this.handleSocketError);
    this.ws.off("close", this.handleSocketClose);
    this.ws.off("message", this.handleSocketMessage);
    this.stopHeartbeat();
    this.emit("close", this, code);
  };

  private handleSocketMessage = (message: string) => {
    const event = JSON.parse(message) as GatewayEvent;
    log.debug("gateway socket event", event.op, event.t);

    if (event.s !== null && typeof event.s === "number") {
      this.sequence = event.s;
    }

    if (event.op === OpCode.Hello) {
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
    log.debug(
      `gateway socket heartbeat started at interval: ${interval}ms, with jitter ${jitter}`
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
      log.debug("gateway socket heartbeat stopped");
      clearTimeout(this.heartbeat);
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }

  /** Send a heartbeat if the WebSocket is open */
  private sendHeartbeat() {
    if (this.ws.readyState === this.ws.OPEN) {
      log.debug("gateway socket heartbeat", this.sequence);
      const event: HeartbeatEvent = {
        op: OpCode.Heartbeat,
        d: this.sequence,
      };
      this.ws.send(JSON.stringify(event));
    }
  }
}
