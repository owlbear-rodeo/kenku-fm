import { TypedEmitter } from "tiny-typed-emitter";
import log from "electron-log/main";
import { GatewaySocket } from "./GatewaySocket";
import { User } from "../types/User";
import { GatewayDescription } from "./GatewayDescription";
import { getGatewayDescription } from "../http/getGatewayDescription";
import { GatewayCloseCode, shouldResumeAfterClose } from "./GatewayCloseCode";
import {
  GatewayEvent,
  IdentifyEvent,
  OpCode,
  ResumeEvent,
} from "./GatewayEvent";
import { INTENTS } from "../constants";
import { reconnectAfterMs } from "../../backoff";
import {
  VoiceGuild,
  getGuildsAndVoiceChannels,
} from "../http/getGuildsAndVoiceChannels";
import debounce from "lodash.debounce";

export enum GatewayConnectionState {
  Disconnected,
  Connecting,
  Ready,
}

export interface GatewayEvents {
  error: (error: Error) => void;
  state: (state: GatewayConnectionState) => void;
  event: (event: GatewayEvent) => void;
  guilds: (guilds: VoiceGuild[]) => void;
}

/**
 * The gateway handles connecting/reconnecting to the discord WebSocket endpoint
 */
export class Gateway extends TypedEmitter<GatewayEvents> {
  private token: string;
  private socket?: GatewaySocket;
  private gatewayDescription?: GatewayDescription;
  private reconnectTries = 0;
  /** The last sequence number from a OpCode 0 Dispatch event */
  private sequence: number | null;
  private sessionId?: string;
  private resumeGatewayURL?: string;
  private guilds: Map<string, VoiceGuild> = new Map();
  private _connectionState: GatewayConnectionState;

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
  user?: User;

  constructor(token: string) {
    super();
    this.token = token;
    this.sequence = null;
    this._connectionState = GatewayConnectionState.Disconnected;
  }

  async connect() {
    if (this.socket) {
      this.socket.close(GatewayCloseCode.Reconnecting);
      this.socket = undefined;
    }

    this.connectionState = GatewayConnectionState.Connecting;

    if (!this.gatewayDescription) {
      const { data, error } = await getGatewayDescription(this.token);
      if (error) {
        log.error(
          "gateway unable to get description",
          error.message,
          error.code
        );
        if (error.message === "401: Unauthorized") {
          this.emit(
            "error",
            Error("Unauthorized. Token might be incorrect or invalid")
          );
        } else {
          this.emit("error", Error(error.message));
        }
        return;
      }
      this.gatewayDescription = data;
    }
    let url = this.gatewayDescription.url;
    if (this.resumeGatewayURL) {
      url = this.resumeGatewayURL;
    }
    this.socket = new GatewaySocket(url);
    this.socket.on("open", this.handleSocketOpen);
    this.socket.on("close", this.handleSocketClose);
    this.socket.on("event", this.handleSocketEvent);
  }

  debounceGetGuildsAndVoiceChannels = debounce(
    () => {
      getGuildsAndVoiceChannels(this.token, this.user.id)
        .then((guilds) => {
          guilds.map((guild) => {
            this.guilds.set(guild.id, guild);
          });
          this.emit("guilds", [...this.guilds.values()]);
        })
        .catch((e) => {
          this.emit("error", e);
        });
    },
    2000,
    { leading: true, trailing: true },
  );

  /** Manually disconnect the gateway with code `GatewayCloseCode.NormalClosure` */
  disconnect() {
    if (this.socket) {
      this.socket.close(GatewayCloseCode.NormalClosure);
      this.socket = undefined;
      log.debug("gateway manual disconnect");
    }
    this.reconnectTries = 0;
    this.connectionState = GatewayConnectionState.Disconnected;
  }

  private handleSocketOpen = (socket: GatewaySocket) => {
    if (this.sessionId && this.sequence) {
      log.debug("gateway resume");
      const resume: ResumeEvent = {
        op: OpCode.Resume,
        d: {
          token: this.token,
          session_id: this.sessionId,
          seq: this.sequence,
        },
      };
      socket.send(resume);
    }
  };

  private handleSocketClose = (socket: GatewaySocket, code: number) => {
    this.connectionState = GatewayConnectionState.Disconnected;

    socket.off("open", this.handleSocketOpen);
    socket.off("close", this.handleSocketClose);
    socket.off("event", this.handleSocketEvent);

    if (socket === this.socket) {
      this.socket = undefined;
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
    if (event.s !== null && typeof event.s === "number") {
      this.sequence = event.s;
    }

    if (event.op === OpCode.Hello) {
      if (!this.resumeGatewayURL) {
        log.debug("gateway identify");
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
      this.reconnectTries = 0;
    } else if (event.op === OpCode.Dispatch) {
      if (event.t === "READY") {
        log.debug("connection ready event", event);
        this.user = event.d.user;
        this.resumeGatewayURL = event.d.resume_gateway_url;
        this.sessionId = event.d.session_id;
        this.connectionState = GatewayConnectionState.Ready;
      } else if (event.t === "RESUMED") {
        this.connectionState = GatewayConnectionState.Ready;
        this.debounceGetGuildsAndVoiceChannels();
      } else if (event.t === "GUILD_CREATE") {
        log.debug("guild create event", event);
        this.debounceGetGuildsAndVoiceChannels();
      } else if (event.t === "GUILD_DELETE") {
        this.guilds.delete(event.d.id);
        this.emit("guilds", [...this.guilds.values()]);
      } else if (event.t === "CHANNEL_CREATE") {
        log.debug("channel create event", event);
        if (event.d.bitrate) {
          this.debounceGetGuildsAndVoiceChannels();
        }
      } else if (event.t === "CHANNEL_DELETE") {
        log.debug("channel delete event", event);
        if (event.d.bitrate) {
          this.guilds.delete(event.d.id);
          this.debounceGetGuildsAndVoiceChannels();
        }
      } else if (event.t === "VOICE_STATE_UPDATE") {
        // this event is triggered when a user joins or leaves the voice channel
        log.debug("voice state update", JSON.stringify(event, null, 2));
        if (event.d.user_id === this.user.id) {
          log.info("kenku fm bot has joined the channel");
        }
      } else if (event.t === "GUILD_UPDATE") {
        // this event is triggered when server settings are changed
        log.debug("guild update", event);
      } else if (event.t === "VOICE_SERVER_UPDATE") {
        // this event is triggered when the first user joins the channel
        log.debug("voice server update", event);
      } else {
        log.debug("unhandled event", JSON.stringify(event, null, 2));
      }
    } else if (event.op === OpCode.Reconnect) {
      this.connect();
    } else if (event.op === OpCode.InvalidSession) {
      if (event.d) {
        this.connect();
      } else {
        this.resumeGatewayURL = undefined;
        this.sessionId = undefined;
        this.sequence = null;
        this.connect();
      }
    }

    this.emit("event", event);
  };

  send(event: GatewayEvent) {
    this.socket?.send(event);
  }
}
