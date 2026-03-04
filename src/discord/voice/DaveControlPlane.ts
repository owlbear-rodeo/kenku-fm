import severus, {
  DaveSession as SeverusDaveSession,
  VoiceConnection as SeverusVoiceConnection,
} from "severus";
import {
  DavePrepareEpochEvent,
  DavePrepareTransitionEvent,
  MlsAnnounceCommitTransitionEvent,
  MlsExternalSenderEvent,
  MlsProposalsEvent,
  MlsWelcomeEvent,
  VoiceGatewayEvent,
  VoiceOpCode,
} from "./VoiceGatewayEvent";
import { VoiceGateway } from "./VoiceGateway";
import { TypedEmitter } from "tiny-typed-emitter";

type PendingMlsEvent = {
  type: "commit" | "welcome";
  transitionId: number;
  payload: Uint8Array;
};

interface DaveControlPlaneOptions {
  getUserId: () => string | undefined;
  getChannelId: () => string | undefined;
  getVoiceGateway: () => VoiceGateway | undefined;
  getSeverusConnection: () => SeverusVoiceConnection | undefined;
}

interface DaveControlPlaneEvents {
  error: (error: Error) => void;
}

export class DaveControlPlane extends TypedEmitter<DaveControlPlaneEvents> {
  private readonly getUserId: DaveControlPlaneOptions["getUserId"];
  private readonly getChannelId: DaveControlPlaneOptions["getChannelId"];
  private readonly getVoiceGateway: DaveControlPlaneOptions["getVoiceGateway"];
  private readonly getSeverusConnection: DaveControlPlaneOptions["getSeverusConnection"];

  private protocolVersion = 0;
  private daveSession: SeverusDaveSession | undefined;
  private pendingTransitions = new Map<number, number>();
  private recognizedUserIds = new Set<string>();
  private externalSenderReady = false;
  private pendingMlsEvents: PendingMlsEvent[] = [];
  private pendingExternalSenderPayload?: Uint8Array;
  private eventChain: Promise<void> = Promise.resolve();

  constructor(options: DaveControlPlaneOptions) {
    super();
    this.getUserId = options.getUserId;
    this.getChannelId = options.getChannelId;
    this.getVoiceGateway = options.getVoiceGateway;
    this.getSeverusConnection = options.getSeverusConnection;
  }

  reset() {
    this.protocolVersion = 0;
    this.daveSession = undefined;
    this.pendingTransitions.clear();
    this.recognizedUserIds.clear();
    this.externalSenderReady = false;
    this.pendingMlsEvents = [];
    this.pendingExternalSenderPayload = undefined;
    this.eventChain = Promise.resolve();
  }

  getSessionForTransport() {
    if (this.protocolVersion <= 0) {
      return null;
    }
    return this.daveSession ?? null;
  }

  async onSessionDescription(daveProtocolVersion: number) {
    this.protocolVersion = daveProtocolVersion;
    const userId = this.getUserId();
    if (userId) {
      this.recognizedUserIds.add(userId);
    }
    await this.ensureDaveSession();
  }

  handleVoiceEvent(event: VoiceGatewayEvent) {
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

    if (event.op < VoiceOpCode.DavePrepareTransition) {
      return;
    }

    this.eventChain = this.eventChain
      .then(() => this.handleVoiceEventInternal(event))
      .catch((error) => {
        this.emit("error", error as Error);
      });
  }

  private async handleVoiceEventInternal(event: VoiceGatewayEvent) {
    if (event.op === VoiceOpCode.DavePrepareTransition) {
      this.handleDavePrepareTransition(event.d);
      return;
    }

    if (event.op === VoiceOpCode.DaveExecuteTransition) {
      this.executeDaveTransition(event.d.transition_id);
      return;
    }

    if (event.op === VoiceOpCode.DavePrepareEpoch) {
      await this.handleDavePrepareEpoch(event.d);
      return;
    }

    if (event.op === VoiceOpCode.MlsExternalSender) {
      await this.handleMlsExternalSender(event.d);
      return;
    }

    if (event.op === VoiceOpCode.MlsProposals) {
      await this.handleMlsProposals(event.d);
      return;
    }

    if (event.op === VoiceOpCode.MlsAnnounceCommitTransition) {
      await this.handleMlsCommit(event.d);
      return;
    }

    if (event.op === VoiceOpCode.MlsWelcome) {
      await this.handleMlsWelcome(event.d);
    }
  }

  private async ensureDaveSession() {
    const userId = this.getUserId();
    const channelId = this.getChannelId();
    if (this.protocolVersion <= 0 || !userId || !channelId) {
      this.daveSession = undefined;
      return;
    }

    this.externalSenderReady = false;
    this.pendingMlsEvents = [];

    if (this.daveSession) {
      await severus.daveSessionReinit(
        this.daveSession,
        this.protocolVersion,
        userId,
        channelId
      );
    } else {
      this.daveSession = await severus.daveSessionNew(
        this.protocolVersion,
        userId,
        channelId
      );
    }

    if (this.pendingExternalSenderPayload) {
      await severus.daveSessionSetExternalSender(
        this.daveSession,
        Array.from(this.pendingExternalSenderPayload)
      );
      this.externalSenderReady = true;
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
    const voiceGateway = this.getVoiceGateway();
    if (!voiceGateway) {
      return;
    }
    voiceGateway.sendBinary(opCode, payload);
  }

  private sendEvent(event: VoiceGatewayEvent) {
    const voiceGateway = this.getVoiceGateway();
    if (!voiceGateway) {
      return;
    }
    voiceGateway.send(event);
  }

  private sendDaveTransitionReady(transitionId: number) {
    if (transitionId === 0) {
      return;
    }
    const event = {
      op: VoiceOpCode.DaveTransitionReady,
      d: {
        transition_id: transitionId,
      },
    } as VoiceGatewayEvent;
    this.sendEvent(event);
  }

  private sendInvalidCommitWelcome(transitionId: number) {
    const event = {
      op: VoiceOpCode.MlsInvalidCommitWelcome,
      d: {
        transition_id: transitionId,
      },
    } as VoiceGatewayEvent;
    this.sendEvent(event);
  }

  private handleDavePrepareTransition(data: DavePrepareTransitionEvent["d"]) {
    this.pendingTransitions.set(data.transition_id, data.protocol_version);
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
      this.protocolVersion = data.protocol_version;
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
    this.externalSenderReady = true;
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
      if (!result.commit) {
        return;
      }

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
    } catch (error) {
      const message = `${error}`;
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
      this.pendingTransitions.set(data.transition_id, this.protocolVersion);
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

      this.sendInvalidCommitWelcome(data.transition_id);
      await this.ensureDaveSession();
      throw error;
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
      this.pendingTransitions.set(data.transition_id, this.protocolVersion);
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

      this.sendInvalidCommitWelcome(data.transition_id);
      await this.ensureDaveSession();
      throw error;
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
    if (!this.daveSession || !this.externalSenderReady) {
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
        this.pendingTransitions.set(item.transitionId, this.protocolVersion);
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

  private executeDaveTransition(transitionId: number) {
    const nextVersion = this.pendingTransitions.get(transitionId);
    if (nextVersion === undefined) {
      return;
    }

    this.pendingTransitions.delete(transitionId);
    this.protocolVersion = nextVersion;

    const severusConnection = this.getSeverusConnection();
    if (!severusConnection) {
      return;
    }

    if (this.protocolVersion === 0) {
      severus.voiceConnectionSetDaveSession(severusConnection, null);
      if (this.daveSession) {
        severus.daveSessionSetPassthroughMode(this.daveSession, true, 10);
      }
      return;
    }

    severus.voiceConnectionSetDaveSession(severusConnection, this.daveSession ?? null);
  }
}
