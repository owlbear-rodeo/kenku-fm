import log from "electron-log/main";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  VoiceGatewayEvent,
  HeartbeatEvent,
  MlsAnnounceCommitTransitionEvent,
  MlsExternalSenderEvent,
  MlsProposalsEvent,
  MlsWelcomeEvent,
  ProposalsOperationType,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import { RawData, WebSocket } from "ws";
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
  private lastSequence: number = -1;
  private static readonly SERVER_BINARY_DAVE_OPS = new Set<number>([25, 27, 29, 30]);

  constructor(endpoint: string, sessionId: string) {
    super();
    this.acknowledged = false;
    this.sessionId = sessionId;

    log.debug(`voice gateway socket ${sessionId} connecting to`, endpoint);
    this.ws = new WebSocket(`wss://${endpoint}/?v=${VOICE_API_VERSION}`);
    this.ws.binaryType = "arraybuffer";
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

  sendBinary(opCode: VoiceOpCode, payload: Uint8Array) {
    const packet = new Uint8Array(1 + payload.length);
    packet[0] = opCode;
    packet.set(payload, 1);
    this.ws.send(packet);
  }

  getLastSequence() {
    return this.lastSequence;
  }

  private handleSocketOpen = () => {
    this.emit("open", this);
  };

  private handleSocketError = (error: Error) => {
    log.error(`voice gateway ${this.sessionId} socket error:`, error);
  };

  private handleSocketClose = (code: number, reason: Buffer) => {
    log.warn(`voice gateway socket ${this.sessionId} closed with code:`, code);
    this.ws.off("open", this.handleSocketOpen);
    this.ws.off("error", this.handleSocketError);
    this.ws.off("close", this.handleSocketClose);
    this.ws.off("message", this.handleSocketMessage);
    this.stopHeartbeat();
    this.emit("close", this, code);
  };

  private handleSocketMessage = (message: RawData, isBinary: boolean) => {
    const event = this.parseEvent(message, isBinary);
    if (!event) {
      return;
    }
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

  private parseEvent(
    message: RawData,
    isBinary: boolean
  ): VoiceGatewayEvent | undefined {
    if (!isBinary) {
      const text =
        typeof message === "string"
          ? message
          : this.decodeText(this.toUint8Array(message));
      const parsed = JSON.parse(text) as VoiceGatewayEvent;
      if (typeof parsed.seq === "number") {
        this.lastSequence = parsed.seq;
      }
      return parsed;
    }

    const bytes = this.toUint8Array(message);
    if (bytes.length === 0) {
      return undefined;
    }

    // Binary messages may arrive in one of these forms:
    // - Server->client numbered: [u16 seq][u8 opcode][payload...]
    // - Unnumbered fallback:      [u8 opcode][payload...]
    let seq: number | undefined;
    let op: VoiceOpCode | undefined;
    let payload: Uint8Array | undefined;

    if (
      bytes.length >= 3 &&
      VoiceGatewaySocket.SERVER_BINARY_DAVE_OPS.has(bytes[2])
    ) {
      seq = (bytes[0] << 8) | bytes[1];
      this.lastSequence = seq;
      op = bytes[2] as VoiceOpCode;
      payload = bytes.subarray(3);
    } else if (
      bytes.length >= 1 &&
      VoiceGatewaySocket.SERVER_BINARY_DAVE_OPS.has(bytes[0])
    ) {
      op = bytes[0] as VoiceOpCode;
      payload = bytes.subarray(1);
    } else {
      return undefined;
    }

    if (op === VoiceOpCode.MlsExternalSender) {
      const event: MlsExternalSenderEvent = {
        op,
        d: { seq: seq ?? -1, payload },
      };
      return event;
    }

    if (op === VoiceOpCode.MlsProposals) {
      if (payload.length < 1) {
        return undefined;
      }
      const event: MlsProposalsEvent = {
        op,
        d: {
          seq: seq ?? -1,
          operation_type: payload[0] as ProposalsOperationType,
          payload: payload.subarray(1),
        },
      };
      return event;
    }

    if (op === VoiceOpCode.MlsAnnounceCommitTransition) {
      if (payload.length < 2) {
        return undefined;
      }
      const event: MlsAnnounceCommitTransitionEvent = {
        op,
        d: {
          seq: seq ?? -1,
          transition_id: (payload[0] << 8) | payload[1],
          payload: payload.subarray(2),
        },
      };
      return event;
    }

    if (op === VoiceOpCode.MlsWelcome) {
      if (payload.length < 2) {
        return undefined;
      }
      const event: MlsWelcomeEvent = {
        op,
        d: {
          seq: seq ?? -1,
          transition_id: (payload[0] << 8) | payload[1],
          payload: payload.subarray(2),
        },
      };
      return event;
    }

    return {
      op,
      d: {
        seq,
        payload,
      },
    } as VoiceGatewayEvent;
  }

  private toUint8Array(message: RawData): Uint8Array {
    if (typeof message === "string") {
      return new TextEncoder().encode(message);
    }
    if (message instanceof ArrayBuffer) {
      return new Uint8Array(message);
    }
    if (ArrayBuffer.isView(message)) {
      return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    }
    if (Array.isArray(message)) {
      let totalLength = 0;
      const chunks = message.map((item) => this.toUint8Array(item));
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const out = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out;
    }
    return new Uint8Array(0);
  }

  private decodeText(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
  }

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
        d: {
          t: nonce,
          seq_ack: this.lastSequence,
        },
      };
      this.ws.send(JSON.stringify(event));
    }
  }
}
