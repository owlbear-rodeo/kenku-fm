import log from "electron-log/main";
import {
  GatewayEvent,
  OpCode,
  UpdateVoiceStateEvent,
  VoiceServerUpdateEvent,
} from "../gateway/GatewayEvent";
import { Gateway, GatewayConnectionState } from "../gateway/Gateway";
import { VoiceState } from "./VoiceState";
import {
  VoiceGateway,
  VoiceGatewayConnectionState,
  VoiceGatewayDescription,
} from "./VoiceGateway";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  ReadyEvent,
  SelectProtocolEvent,
  SessionDescriptionEvent,
  SpeakingEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";

export interface VoiceConnectionEvents {
  error: (error: Error) => void;
  ready: (data: ReadyEvent["d"]) => void;
  session: (data: SessionDescriptionEvent["d"]) => void;
}

export class VoiceConnection extends TypedEmitter<VoiceConnectionEvents> {
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
    if (this.gateway.connectionState !== GatewayConnectionState.Ready) {
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
      log.debug("gateway voice update join channel");
      this.gateway.send(voiceUpdate);

      // Wait for both the VoiceStateUpdate and VoiceServerUpdate events
      let serverUpdate: VoiceServerUpdateEvent["d"] | undefined = undefined;
      let voiceState: VoiceState | undefined = undefined;
      const handleGatewayEvent = (event: GatewayEvent) => {
        if (event.op === OpCode.Dispatch) {
          if (event.t === "VOICE_STATE_UPDATE") {
            if (event.d.user_id === this.gateway.user?.id) {
              voiceState = event.d;
            }
          } else if (event.t === "VOICE_SERVER_UPDATE") {
            serverUpdate = event.d;
          }
          // Create the VoiceGateway once we have both states
          if (serverUpdate && voiceState) {
            this.gateway?.off("event", handleGatewayEvent);
            clearTimeout(timeout);
            this.openGateway({
              endpoint: serverUpdate.endpoint,
              guildId: serverUpdate.guild_id,
              token: serverUpdate.token,
              sessionId: voiceState.session_id,
              userId: this.gateway.user?.id,
            });
            resolve(undefined);
          }
        }
      };

      this.gateway.on("event", handleGatewayEvent);

      // Timeout the connection request if it takes too long
      const timeout = setTimeout(() => {
        this.gateway.off("event", handleGatewayEvent);
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

    if (this.gateway.connectionState === GatewayConnectionState.Ready) {
      const state: UpdateVoiceStateEvent = {
        op: OpCode.UpdateVoiceState,
        d: {
          channel_id: null,
          guild_id: this.guildId,
          self_deaf: true,
          self_mute: false,
        },
      };
      this.gateway.send(state);
    }
  }

  private openGateway(description: VoiceGatewayDescription) {
    if (this.voiceGateway) {
      this.closeGateway();
    }
    this.voiceGateway = new VoiceGateway(this.gateway, description);
    this.voiceGateway.on("error", this.handleVoiceError);
    this.voiceGateway.on("ready", this.handleVoiceReady);
    this.voiceGateway.on("session", this.handleVoiceSession);
  }

  private closeGateway() {
    if (this.voiceGateway) {
      this.voiceGateway.off("error", this.handleVoiceError);
      this.voiceGateway.off("ready", this.handleVoiceReady);
      this.voiceGateway.off("session", this.handleVoiceSession);
      this.voiceGateway.disconnect();
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
      this.voiceGateway.connectionState !== VoiceGatewayConnectionState.Ready
    ) {
      throw Error("Unable to select voice protocol: voice gateway not ready");
    }

    log.debug(
      "voice connection selecting protocol",
      data.protocol,
      "with mode",
      data.data.mode
    );

    const selectProtocol: SelectProtocolEvent = {
      op: VoiceOpCode.SelectProtocol,
      d: data,
    };
    this.voiceGateway.send(selectProtocol);
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
      this.voiceGateway.connectionState !== VoiceGatewayConnectionState.Ready
    ) {
      throw Error("Unable to update speaking: voice gateway not ready");
    }

    log.debug("voice connection update speaking", data.speaking);

    const updateSpeaking: SpeakingEvent = {
      op: VoiceOpCode.Speaking,
      d: data,
    };
    this.voiceGateway.send(updateSpeaking);
  }

  getSSRC(): number | undefined {
    return this.voiceGateway?.ssrc;
  }
}
