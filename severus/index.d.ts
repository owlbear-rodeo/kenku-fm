declare module "severus" {
  export interface IpDiscovery {
    address: string;
    port: number;
  }
  export interface VoiceConnection {}
  export interface DaveSession {}
  export interface RTCClient {}
  export interface Broadcast {}
  export interface Severus {
    voiceConnectionNew: (
      ip: string,
      port: number,
      ssrc: number
    ) => Promise<VoiceConnection>;
    voiceConnectionDiscoverIp: (
      voiceConnection: VoiceConnection
    ) => Promise<IpDiscovery>;
    voiceConnectionConnect: (
      voiceConnection: VoiceConnection,
      secretKey: number[],
      cryptoMode: string,
      broadcast: Broadcast
    ) => Promise<void>;
    voiceConnectionSetDaveSession: (
      voiceConnection: VoiceConnection,
      daveSession: DaveSession | null
    ) => void;
    voiceConnectionDisconnect: (
      voiceConnection: VoiceConnection
    ) => Promise<void>;
    daveSessionNew: (
      protocolVersion: number,
      userId: string,
      channelId: string
    ) => Promise<DaveSession>;
    daveSessionReinit: (
      daveSession: DaveSession,
      protocolVersion: number,
      userId: string,
      channelId: string
    ) => Promise<void>;
    daveSessionReset: (daveSession: DaveSession) => Promise<void>;
    daveSessionSetExternalSender: (
      daveSession: DaveSession,
      payload: number[]
    ) => Promise<void>;
    daveSessionGetKeyPackage: (daveSession: DaveSession) => Promise<number[]>;
    daveSessionProcessProposals: (
      daveSession: DaveSession,
      operationType: number,
      payload: number[],
      recognizedUserIds: string[]
    ) => Promise<{
      commit?: number[];
      welcome?: number[];
    }>;
    daveSessionProcessCommit: (
      daveSession: DaveSession,
      payload: number[]
    ) => Promise<void>;
    daveSessionProcessWelcome: (
      daveSession: DaveSession,
      payload: number[]
    ) => Promise<void>;
    daveSessionSetPassthroughMode: (
      daveSession: DaveSession,
      passthroughMode: boolean,
      transitionExpirySeconds: number
    ) => void;
    daveSessionCanPassthrough: (
      daveSession: DaveSession,
      userId: string
    ) => boolean;
    rtcNew: (broadcast: Broadcast) => Promise<RTCClient>;
    rtcSignal: (rtc: RTCClient, offer: string) => Promise<string>;
    rtcAddCandidate: (rtc: RTCClient, candidate: string) => Promise<void>;
    rtcOnCandidate: (
      rtc: RTCClient,
      onCandidate: (candidate: string) => void
    ) => void;
    rtcOnClose: (rtc: RTCClient, onClose: () => void) => void;
    rtcClose: (rtc: RTCClient) => Promise<void>;
    logInit: () => void;
    logSetLogLevel: (level: string) => void;
    logOnLog: (onLog: (level: string, message: string) => void) => void;
    broadcastNew: () => Broadcast;
  }

  const severus: Severus;

  export = severus;
}
