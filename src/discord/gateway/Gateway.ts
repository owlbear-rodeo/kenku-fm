import EventEmitter from "events";
import log from "electron-log/main";
import { GatewaySocket } from "./GatewaySocket";
import { User } from "../types/User";
import { GatewayDescription } from "./GatewayDescription";
import { getGatewayDescription } from "./getGatewayDescription";
import { GatewayCloseCode, shouldResumeAfterClose } from "./GatewayCloseCode";
import {
  GatewayEvent,
  IdentifyEvent,
  OpCode,
  ResumeEvent,
} from "./GatewayEvent";
import { INTENTS } from "../constants";
import { FullGuild } from "../types/Guild";
import { reconnectAfterMs } from "../../backoff";

type ReconnectState = {
  resumeGatewayURL: string;
  sessionId: string;
  sequence: number | null;
};

export interface Gateway extends EventEmitter {
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "guilds", listener: (guilds: FullGuild[]) => void): this;

  off(event: "error", listener: (error: Error) => void): this;
  off(event: "guilds", listener: (guilds: FullGuild[]) => void): this;

  emit(event: "error", error: Error): boolean;
  emit(event: "guilds", guilds: FullGuild[]): boolean;
}

/**
 * The gateway handles connecting/reconnecting to the discord WebSocket endpoint
 */
export class Gateway extends EventEmitter {
  private token: string;
  socket?: GatewaySocket;
  private gatewayDescription?: GatewayDescription;
  private reconnectState?: ReconnectState;
  private reconnectTries = 0;
  guilds: FullGuild[];

  constructor(token: string) {
    super();
    this.token = token;
    this.guilds = [];
  }

  async connect() {
    if (this.socket) {
      this.socket.close(GatewayCloseCode.Reconnecting);
      this.socket = undefined;
    }

    if (!this.gatewayDescription) {
      const { data, error } = await getGatewayDescription(this.token);
      if (error) {
        log.error("gateway unable to get description", error.message);
        this.emit("error", Error(error.message));
        return;
      }
      this.gatewayDescription = data;
    }
    let url = this.gatewayDescription.url;
    if (this.reconnectState) {
      url = this.reconnectState.resumeGatewayURL;
    }
    this.socket = new GatewaySocket(url);
    this.socket.on("open", this.handleSocketOpen);
    this.socket.on("close", this.handleSocketClose);
    this.socket.on("event", this.handleSocketEvent);
  }

  /** Manually disconnect the gateway with code `GatewayCloseCode.NormalClosure` */
  disconnect() {
    if (this.socket) {
      this.socket.close(GatewayCloseCode.NormalClosure);
      this.socket = undefined;
      log.debug("gateway manual disconnect");
    }
    this.reconnectTries = 0;
  }

  private handleSocketOpen = (socket: GatewaySocket) => {
    if (this.reconnectState) {
      const resume: ResumeEvent = {
        op: OpCode.Resume,
        d: {
          token: this.token,
          session_id: this.reconnectState.sessionId,
          seq: this.reconnectState.sequence,
        },
      };
      socket.send(resume);
      log.debug("gateway resume", this.reconnectState);
    }
    this.reconnectTries = 0;
  };

  private handleSocketClose = (socket: GatewaySocket, code: number) => {
    socket.off("open", this.handleSocketOpen);
    socket.off("close", this.handleSocketClose);
    socket.off("event", this.handleSocketEvent);

    if (socket === this.socket) {
      this.socket = undefined;
    }

    if (socket.readyState) {
      this.reconnectState = {
        resumeGatewayURL: socket.readyState.resumeGatewayURL,
        sessionId: socket.readyState.sessionId,
        sequence: socket.sequence,
      };
    } else {
      this.reconnectState = undefined;
    }

    if (shouldResumeAfterClose(code)) {
      this.reconnectTries += 1;
      const after = reconnectAfterMs(this.reconnectTries);
      log.debug("gateway reconnecting from code", code, "in", after, "ms");
      setTimeout(() => {
        // Check to see if we still need to reconnect
        if (!this.socket && this.reconnectTries > 0) {
          log.debug("gateway reconnecting from code", code);
          this.connect();
        } else {
          log.debug("gateway reconnect ignored");
        }
      }, after);
    } else if (
      code !== GatewayCloseCode.Reconnecting &&
      code !== GatewayCloseCode.NormalClosure
    ) {
      this.emit("error", Error(`Gateway socket closed with code: ${code}`));
    }
  };

  private handleSocketEvent = (socket: GatewaySocket, event: GatewayEvent) => {
    if (event.op === OpCode.Hello) {
      if (!this.reconnectState) {
        const identify: IdentifyEvent = {
          op: OpCode.Identify,
          d: {
            intents: INTENTS,
            token: this.token,
            properties: {
              os: process.platform,
              browser: "kenku",
              device: "kenku",
            },
          },
        };
        socket.send(identify);
      }
    } else if (event.op === OpCode.Dispatch) {
      // Manage the guilds array
      if (event.t === "GUILD_CREATE") {
        const index = this.guilds.findIndex((v) => v.id === event.d.id);
        if (index >= 0) {
          this.guilds[index] = event.d;
        } else {
          this.guilds.push(event.d);
        }
        this.emit("guilds", this.guilds);
      } else if (event.t === "GUILD_DELETE") {
        const index = this.guilds.findIndex((v) => v.id === event.d.id);
        if (index >= 0) {
          this.guilds.splice(index, 1);
        }
        this.emit("guilds", this.guilds);
      } else if (event.t === "GUILD_UPDATE") {
        const index = this.guilds.findIndex((v) => v.id === event.d.id);
        if (index >= 0) {
          this.guilds[index] = {
            ...this.guilds[index],
            ...event.d,
          };
        }
        this.emit("guilds", this.guilds);
      }
    } else if (event.op === OpCode.Reconnect) {
      this.connect();
    } else if (event.op === OpCode.InvalidSession) {
      if (event.d) {
        this.connect();
      } else {
        this.reconnectState = undefined;
        this.connect();
      }
    }
  };

  getUser(): User | undefined {
    if (this.socket && this.socket.readyState) {
      return this.socket.readyState.user;
    }
  }
}
