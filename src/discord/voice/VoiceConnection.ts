import {
  GatewayEvent,
  OpCode,
  UpdateVoiceStateEvent,
  VoiceServerUpdateEvent,
} from "../gateway/GatewayEvent";
import { Gateway } from "../gateway/Gateway";
import { VoiceState } from "./VoiceState";
import { VoiceGateway } from "./VoiceGateway";
import {
  VoiceSocketDescription,
  ConnectionState as VoiceConnectionState,
} from "./VoiceGatewaySocket";
import { ConnectionState, GatewaySocket } from "../gateway/GatewaySocket";
import EventEmitter from "events";
import {
  ReadyEvent,
  SelectProtocolEvent,
  SessionDescriptionEvent,
  SpeakingEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";

export interface VoiceConnection extends EventEmitter {
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

export class VoiceConnection extends EventEmitter {
  private gateway: Gateway;
  private connectionTimeout: number;
  private voiceGateway?: VoiceGateway;
  private connectionPromise: Promise<void> | undefined;
  private guildId: string;

  constructor(guildId: string, gateway: Gateway, connectionTimeout = 5000) {
    super();
    this.gateway = gateway;
    this.connectionTimeout = connectionTimeout;
    this.guildId = guildId;
  }

  async connect(channelId: string | null) {
    if (this.gateway.socket?.connectionState !== ConnectionState.Ready) {
      throw Error("Unable to join voice channel: gateway not ready");
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.voiceGateway) {
      this.voiceGateway.disconnect();
      this.voiceGateway = undefined;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const voiceUpdate: UpdateVoiceStateEvent = {
        op: OpCode.UpdateVoiceState,
        d: {
          channel_id: channelId,
          guild_id: this.guildId,
          self_deaf: true,
          self_mute: false,
        },
      };
      this.gateway.socket.send(voiceUpdate);

      // Wait for both the VoiceStateUpdate and VoiceServerUpdate events
      let serverUpdate: VoiceServerUpdateEvent["d"] | undefined = undefined;
      let voiceState: VoiceState | undefined = undefined;
      const handleSocketEvent = (
        socket: GatewaySocket,
        event: GatewayEvent
      ) => {
        if (event.op === OpCode.Dispatch) {
          if (event.t === "VOICE_STATE_UPDATE") {
            if (event.d.user_id === this.gateway.getUser()?.id) {
              voiceState = event.d;
            }
          } else if (event.t === "VOICE_SERVER_UPDATE") {
            serverUpdate = event.d;
          }
          // Create the VoiceGateway once we have both states
          if (serverUpdate && voiceState) {
            socket?.off("event", handleSocketEvent);
            clearTimeout(timeout);
            this.openGateway({
              endpoint: serverUpdate.endpoint,
              guildId: serverUpdate.guild_id,
              token: serverUpdate.token,
              sessionId: voiceState.session_id,
              userId: this.gateway.getUser()?.id,
            });
            resolve(undefined);
          }
        }
      };

      this.gateway.socket?.on("event", handleSocketEvent);

      // Timeout the connection request if it takes too long
      const timeout = setTimeout(() => {
        this.gateway.socket?.off("event", handleSocketEvent);
        reject(
          new Error(
            `Unable to join voice channel: took longer than ${this.connectionTimeout}ms to get a result`
          )
        );
      }, this.connectionTimeout);
    });

    try {
      await this.connectionPromise;
      this.connectionPromise = undefined;
    } catch (error) {
      this.connectionPromise = undefined;
      throw error;
    }
  }

  async disconnect() {
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {}
    }

    this.closeGateway();

    if (this.gateway.socket?.connectionState === ConnectionState.Ready) {
      const state: UpdateVoiceStateEvent = {
        op: OpCode.UpdateVoiceState,
        d: {
          channel_id: null,
          guild_id: this.guildId,
          self_deaf: true,
          self_mute: false,
        },
      };
      this.gateway.socket.send(state);
    }
  }

  private openGateway(description: VoiceSocketDescription) {
    if (this.voiceGateway) {
      this.closeGateway();
    }
    this.voiceGateway = new VoiceGateway(description);
    this.voiceGateway.on("error", this.handleVoiceError);
    this.voiceGateway.on("ready", this.handleVoiceReady);
    this.voiceGateway.on("session", this.handleVoiceSession);
  }

  private closeGateway() {
    if (this.voiceGateway) {
      this.voiceGateway.disconnect();
      this.voiceGateway.off("error", this.handleVoiceError);
      this.voiceGateway.off("ready", this.handleVoiceReady);
      this.voiceGateway.off("session", this.handleVoiceSession);
      this.voiceGateway = undefined;
    }
  }

  private handleVoiceError = (error: Error) => {
    this.emit("error", error);
  };

  private handleVoiceReady = (data: ReadyEvent["d"]) => {
    this.emit("ready", data);
  };

  private handleVoiceSession = (data: SessionDescriptionEvent["d"]) => {
    this.emit("session", data);
  };

  /**
   * Select a protocol to use for the voice connection
   * This should be done after UDP IP Discovery
   * @link https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-udp-connection
   */
  selectProtocol(data: SelectProtocolEvent["d"]) {
    if (!this.voiceGateway) {
      throw Error("Unable to select voice protocol: no gateway found");
    }
    if (
      this.voiceGateway.socket?.connectionState !== VoiceConnectionState.Ready
    ) {
      throw Error("Unable to select voice protocol: voice gateway not ready");
    }
    const selectProtocol: SelectProtocolEvent = {
      op: VoiceOpCode.SelectProtocol,
      d: data,
    };
    this.voiceGateway.socket.send(selectProtocol);
  }

  /**
   * Update the speaking state for a connection
   * Muse be done once before sending voice data
   * @link https://discord.com/developers/docs/topics/voice-connections#speaking
   */
  updateSpeaking(data: SpeakingEvent["d"]) {
    if (!this.voiceGateway) {
      throw Error("Unable to update speaking: no gateway found");
    }
    if (
      this.voiceGateway.socket?.connectionState !== VoiceConnectionState.Ready
    ) {
      throw Error("Unable to update speaking: voice gateway not ready");
    }
    const updateSpeaking: SpeakingEvent = {
      op: VoiceOpCode.Speaking,
      d: data,
    };
    this.voiceGateway.socket.send(updateSpeaking);
  }

  getSSRC(): number | undefined {
    return this.voiceGateway?.ssrc;
  }
}
