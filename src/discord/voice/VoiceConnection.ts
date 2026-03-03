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
  DavePrepareEpochEvent,
  DavePrepareTransitionEvent,
  DiscordVoiceEncryptionMode,
  MlsAnnounceCommitTransitionEvent,
  MlsExternalSenderEvent,
  MlsProposalsEvent,
  MlsWelcomeEvent,
  ReadyEvent,
  SelectProtocolEvent,
  SessionDescriptionEvent,
  SpeakingEvent,
  VoiceGatewayEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import severus, {
  Broadcast,
  DaveSession as SeverusDaveSession,
  VoiceConnection as SeverusVoiceConnection,
} from "severus";
import {
  FALLBACK_AUDIO_ENCRYPTION,
  PREFERRED_AUDIO_ENCRYPTION,
  SUPPORTED_AUDIO_ENCRYPTION,
} from "../constants";

export interface VoiceConnectionEvents {
  error: (error: Error) => void;
  close: (code: number) => void;
}

export class VoiceConnection extends TypedEmitter<VoiceConnectionEvents> {
  private gateway: Gateway;
  private connectionTimeout: number;
  private voiceGateway?: VoiceGateway;
  private connectionPromise: Promise<void> | undefined;
  private guildId: string;
  private activeChannelId?: string;
  private severusConnection?: SeverusVoiceConnection;
  private broadcast: Broadcast;
  private daveProtocolVersion = 0;
  private daveSession: SeverusDaveSession | undefined;
  private davePendingTransitions = new Map<number, number>();
  private recognizedUserIds = new Set<string>();
  private daveExternalSenderReady = false;
  private pendingMlsEvents: Array<{
    type: "commit" | "welcome";
    transitionId: number;
    payload: Uint8Array;
  }> = [];
  private pendingExternalSenderPayload?: Uint8Array;

  constructor(
    guildId: string,
    gateway: Gateway,
    broadcast: Broadcast,
    connectionTimeout = 5000
  ) {
    super();
    this.gateway = gateway;
    this.connectionTimeout = connectionTimeout;
    this.guildId = guildId;
    this.broadcast = broadcast;
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
      this.activeChannelId = channelId ?? undefined;
      this.gateway.send(voiceUpdate);

      // Wait for both the VoiceStateUpdate and VoiceServerUpdate events
      let serverUpdate: VoiceServerUpdateEvent["d"] | undefined = undefined;
      let voiceState: VoiceState | undefined = undefined;
      const handleGatewayEvent = (event: GatewayEvent) => {
        if (event.op === OpCode.Dispatch) {
          if (event.t === "VOICE_STATE_UPDATE") {
            if (
              event.d.user_id === this.gateway.user?.id &&
              event.d.guild_id === this.guildId &&
              event.d.channel_id === channelId
            ) {
              voiceState = event.d;
            }
          } else if (event.t === "VOICE_SERVER_UPDATE") {
            if (event.d.guild_id === this.guildId) {
              serverUpdate = event.d;
            }
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

    if (this.severusConnection) {
      severus.voiceConnectionSetDaveSession(this.severusConnection, null);
      await severus.voiceConnectionDisconnect(this.severusConnection);
      this.severusConnection = undefined;
    }
    this.daveSession = undefined;
    this.daveProtocolVersion = 0;
    this.activeChannelId = undefined;
    this.daveExternalSenderReady = false;
    this.pendingMlsEvents = [];
    this.pendingExternalSenderPayload = undefined;
    this.davePendingTransitions.clear();
    this.recognizedUserIds.clear();
  }

  private openGateway(description: VoiceGatewayDescription) {
    if (this.voiceGateway) {
      this.closeGateway();
    }
    this.voiceGateway = new VoiceGateway(this.gateway, description);
    this.recognizedUserIds.clear();
    this.voiceGateway.on("close", this.handleVoiceClose);
    this.voiceGateway.on("event", this.handleVoiceEvent);
    this.voiceGateway.on("ready", this.handleVoiceReady);
    this.voiceGateway.on("session", this.handleVoiceSession);
  }

  private closeGateway() {
    if (this.voiceGateway) {
      this.voiceGateway.off("close", this.handleVoiceClose);
      this.voiceGateway.off("event", this.handleVoiceEvent);
      this.voiceGateway.off("ready", this.handleVoiceReady);
      this.voiceGateway.off("session", this.handleVoiceSession);
      this.voiceGateway.disconnect();
      this.voiceGateway = undefined;
    }
    this.davePendingTransitions.clear();
    this.daveExternalSenderReady = false;
    this.pendingMlsEvents = [];
    this.pendingExternalSenderPayload = undefined;
    this.recognizedUserIds.clear();
  }

  private handleVoiceClose = (code: number) => {
    this.emit("close", code);
  };

  private handleVoiceEvent = (event: VoiceGatewayEvent) => {
    if (event.op === VoiceOpCode.ClientsConnect) {
      for (const userId of event.d.user_ids) {
        this.recognizedUserIds.add(userId);
      }
      return;
    }

    if (event.op === VoiceOpCode.ClientDisconnect) {
      this.recognizedUserIds.delete(event.d.user_id);
      return;
    }

    if (event.op === VoiceOpCode.DavePrepareTransition) {
      this.handleDavePrepareTransition(event.d);
      return;
    }

    if (event.op === VoiceOpCode.DaveExecuteTransition) {
      this.executeDaveTransition(event.d.transition_id);
      return;
    }

    if (event.op === VoiceOpCode.DavePrepareEpoch) {
      this.handleDavePrepareEpoch(event.d).catch((error) => this.emit("error", error));
      return;
    }

    if (event.op === VoiceOpCode.MlsExternalSender) {
      this.handleMlsExternalSender(event.d).catch((error) => this.emit("error", error));
      return;
    }

    if (event.op === VoiceOpCode.MlsProposals) {
      this.handleMlsProposals(event.d).catch((error) => this.emit("error", error));
      return;
    }

    if (event.op === VoiceOpCode.MlsAnnounceCommitTransition) {
      this.handleMlsCommit(event.d).catch((error) => this.emit("error", error));
      return;
    }

    if (event.op === VoiceOpCode.MlsWelcome) {
      this.handleMlsWelcome(event.d).catch((error) => this.emit("error", error));
      return;
    }
  };

  private handleVoiceReady = async (data: ReadyEvent["d"]) => {
    log.debug("voice ready event", data);
    try {
      const readyGateway = this.voiceGateway;
      const isVoiceEncryptionSupported = data.modes.filter((mode) =>
        SUPPORTED_AUDIO_ENCRYPTION.includes(mode)
      );
      if (isVoiceEncryptionSupported.length === 0) {
        throw Error("Encryption mode not supported");
      }
      this.updateSpeaking({
        speaking: 1 << 1,
        delay: 0,
        ssrc: data.ssrc,
      });
      this.severusConnection = await severus.voiceConnectionNew(
        data.ip,
        data.port,
        data.ssrc
      );
      const ip = await severus.voiceConnectionDiscoverIp(
        this.severusConnection
      );
      const selectedEncryption: DiscordVoiceEncryptionMode =
        isVoiceEncryptionSupported.includes(PREFERRED_AUDIO_ENCRYPTION)
          ? PREFERRED_AUDIO_ENCRYPTION
          : FALLBACK_AUDIO_ENCRYPTION;
      log.debug(
        `selecting encryption mode: ${selectedEncryption} for audio encryption`
      );
      if (!readyGateway || this.voiceGateway !== readyGateway) {
        return;
      }
      if (
        this.voiceGateway.connectionState !== VoiceGatewayConnectionState.Ready
      ) {
        return;
      }
      this.selectProtocol({
        protocol: "udp",
        data: {
          address: ip.address,
          port: ip.port,
          mode: selectedEncryption,
        },
      });
    } catch (error) {
      log.error("voice connection handleVoiceReady failed", {
        error,
        hasVoiceGateway: !!this.voiceGateway,
        voiceGatewayState: this.voiceGateway?.connectionState,
      });
      this.emit("error", error);
    }
  };

  private handleVoiceSession = async (
    session: SessionDescriptionEvent["d"]
  ) => {
    try {
      if (!this.severusConnection) {
        throw Error("Unable to start session: no udp connection found");
      }
      this.daveProtocolVersion = session.dave_protocol_version ?? 0;
      if (this.gateway.user?.id) {
        this.recognizedUserIds.add(this.gateway.user.id);
      }
      await this.ensureDaveSession();
      severus.voiceConnectionSetDaveSession(
        this.severusConnection,
        this.daveProtocolVersion > 0 ? this.daveSession ?? null : null
      );
      await severus.voiceConnectionConnect(
        this.severusConnection,
        session.secret_key,
        session.mode,
        this.broadcast
      );
    } catch (error) {
      log.error("voice connection handleVoiceSession failed", {
        error,
        hasSeverusConnection: !!this.severusConnection,
      });
      this.emit("error", error);
    }
  };

  private async ensureDaveSession() {
    if (
      this.daveProtocolVersion <= 0 ||
      !this.gateway.user?.id ||
      !this.activeChannelId
    ) {
      this.daveSession = undefined;
      return;
    }
    this.daveExternalSenderReady = false;
    this.pendingMlsEvents = [];
    if (this.daveSession) {
      await severus.daveSessionReinit(
        this.daveSession,
        this.daveProtocolVersion,
        this.gateway.user.id,
        this.activeChannelId
      );
    } else {
      this.daveSession = await severus.daveSessionNew(
        this.daveProtocolVersion,
        this.gateway.user.id,
        this.activeChannelId
      );
    }

    if (this.pendingExternalSenderPayload) {
      await severus.daveSessionSetExternalSender(
        this.daveSession,
        Array.from(this.pendingExternalSenderPayload)
      );
      this.daveExternalSenderReady = true;
      this.pendingExternalSenderPayload = undefined;
    }

    await this.sendMlsKeyPackage();
  }

  private async sendMlsKeyPackage() {
    if (!this.daveSession) {
      return;
    }
    const keyPackage = await severus.daveSessionGetKeyPackage(this.daveSession);
    this.sendBinary(VoiceOpCode.MlsKeyPackage, new Uint8Array(keyPackage));
  }

  private sendBinary(opCode: VoiceOpCode, payload: Uint8Array) {
    if (!this.voiceGateway) {
      return;
    }
    this.voiceGateway.sendBinary(opCode, payload);
  }

  private sendDaveTransitionReady(transitionId: number) {
    if (transitionId === 0 || !this.voiceGateway) {
      return;
    }
    const event = {
      op: VoiceOpCode.DaveTransitionReady,
      d: {
        transition_id: transitionId,
      },
    };
    this.voiceGateway.send(event as VoiceGatewayEvent);
  }

  private handleDavePrepareTransition(data: DavePrepareTransitionEvent["d"]) {
    this.davePendingTransitions.set(data.transition_id, data.protocol_version);
    if (data.protocol_version === 0 && this.daveSession) {
      severus.daveSessionSetPassthroughMode(this.daveSession, true, 120);
    }
    if (data.transition_id === 0) {
      this.executeDaveTransition(data.transition_id);
      return;
    }
    this.sendDaveTransitionReady(data.transition_id);
  }

  private async handleDavePrepareEpoch(data: DavePrepareEpochEvent["d"]) {
    if (data.epoch === 1) {
      this.daveProtocolVersion = data.protocol_version;
      await this.ensureDaveSession();
    }
  }

  private async handleMlsExternalSender(data: MlsExternalSenderEvent["d"]) {
    if (!this.daveSession) {
      this.pendingExternalSenderPayload = data.payload.slice();
      return;
    }
    await severus.daveSessionSetExternalSender(
      this.daveSession,
      Array.from(data.payload)
    );
    this.daveExternalSenderReady = true;
    await this.sendMlsKeyPackage();
    await this.flushPendingMlsEvents();
  }

  private async handleMlsProposals(data: MlsProposalsEvent["d"]) {
    if (!this.daveSession) {
      return;
    }
    try {
      const result = await severus.daveSessionProcessProposals(
        this.daveSession,
        data.operation_type,
        Array.from(data.payload),
        [...this.recognizedUserIds]
      );
      if (result.commit) {
        const commit = new Uint8Array(result.commit);
        let payload: Uint8Array;
        if (result.welcome) {
          const welcome = new Uint8Array(result.welcome);
          payload = new Uint8Array(commit.length + welcome.length);
          payload.set(commit, 0);
          payload.set(welcome, commit.length);
        } else {
          payload = commit;
        }
        this.sendBinary(VoiceOpCode.MlsCommitWelcome, payload);
      }
    } catch (error) {
      const message = `${error}`;
      // Non-fatal during transition windows where proposals can race ahead
      // of local group initialization.
      if (
        message.includes("without a group") ||
        message.includes("NoGroup") ||
        message.includes("no group")
      ) {
        return;
      }
      throw error;
    }
  }

  private async handleMlsCommit(data: MlsAnnounceCommitTransitionEvent["d"]) {
    if (!this.daveSession) {
      return;
    }
    try {
      await severus.daveSessionProcessCommit(
        this.daveSession,
        Array.from(data.payload)
      );
      this.davePendingTransitions.set(data.transition_id, this.daveProtocolVersion);
      this.sendDaveTransitionReady(data.transition_id);
    } catch (error) {
      if (this.isMissingExternalSenderError(error)) {
        this.pendingMlsEvents.push({
          type: "commit",
          transitionId: data.transition_id,
          payload: data.payload.slice(),
        });
        return;
      }
      this.emit("error", error);
      this.sendInvalidCommitWelcome(data.transition_id);
      await this.ensureDaveSession();
    }
  }

  private async handleMlsWelcome(data: MlsWelcomeEvent["d"]) {
    if (!this.daveSession) {
      return;
    }
    try {
      await severus.daveSessionProcessWelcome(
        this.daveSession,
        Array.from(data.payload)
      );
      this.davePendingTransitions.set(data.transition_id, this.daveProtocolVersion);
      this.sendDaveTransitionReady(data.transition_id);
    } catch (error) {
      if (this.isMissingExternalSenderError(error)) {
        this.pendingMlsEvents.push({
          type: "welcome",
          transitionId: data.transition_id,
          payload: data.payload.slice(),
        });
        return;
      }
      this.emit("error", error);
      this.sendInvalidCommitWelcome(data.transition_id);
      await this.ensureDaveSession();
    }
  }

  private isMissingExternalSenderError(error: unknown) {
    const message = `${error}`;
    return (
      message.includes("without an external sender") ||
      message.includes("NoExternalSender") ||
      message.includes("external sender")
    );
  }

  private async flushPendingMlsEvents() {
    if (!this.daveSession || !this.daveExternalSenderReady) {
      return;
    }
    if (this.pendingMlsEvents.length === 0) {
      return;
    }
    const pending = this.pendingMlsEvents;
    this.pendingMlsEvents = [];
    for (const item of pending) {
      try {
        if (item.type === "commit") {
          await severus.daveSessionProcessCommit(
            this.daveSession,
            Array.from(item.payload)
          );
        } else {
          await severus.daveSessionProcessWelcome(
            this.daveSession,
            Array.from(item.payload)
          );
        }
        this.davePendingTransitions.set(
          item.transitionId,
          this.daveProtocolVersion
        );
        this.sendDaveTransitionReady(item.transitionId);
      } catch (error) {
        if (this.isMissingExternalSenderError(error)) {
          this.pendingMlsEvents.push(item);
          break;
        }
        this.emit("error", error as Error);
      }
    }
  }

  private sendInvalidCommitWelcome(transitionId: number) {
    if (!this.voiceGateway) {
      return;
    }
    const event = {
      op: VoiceOpCode.MlsInvalidCommitWelcome,
      d: {
        transition_id: transitionId,
      },
    };
    this.voiceGateway.send(event as VoiceGatewayEvent);
  }

  private executeDaveTransition(transitionId: number) {
    const nextVersion = this.davePendingTransitions.get(transitionId);
    if (nextVersion === undefined) {
      return;
    }
    this.davePendingTransitions.delete(transitionId);
    this.daveProtocolVersion = nextVersion;
    if (!this.severusConnection) {
      return;
    }
    if (this.daveProtocolVersion === 0) {
      severus.voiceConnectionSetDaveSession(this.severusConnection, null);
      if (this.daveSession) {
        severus.daveSessionSetPassthroughMode(this.daveSession, true, 10);
      }
      return;
    }
    severus.voiceConnectionSetDaveSession(
      this.severusConnection,
      this.daveSession ?? null
    );
  }

  /**
   * Select a protocol to use for the voice connection
   * This should be done after UDP IP Discovery
   * @link https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-udp-connection
   */
  private selectProtocol(data: SelectProtocolEvent["d"]) {
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
  private updateSpeaking(data: SpeakingEvent["d"]) {
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
}
