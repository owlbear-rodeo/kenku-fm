declare module "severus" {
  export interface IpDiscovery {
    address: string;
    port: number;
  }
  export interface VoiceConnection {}
  export interface RTCClient {}
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
      rtc: RTCClient
    ) => Promise<void>;
    voiceConnectionDisconnect: (
      voiceConnection: VoiceConnection
    ) => Promise<void>;
    rtcNew: () => Promise<RTCClient>;
    rtcSignal: (rtc: RTCClient, offer: string) => Promise<string>;
    rtcAddCandidate: (rtc: RTCClient, candidate: string) => Promise<void>;
    rtcOnCandidate: (
      rtc: RTCClient,
      onCandidate: (candidate: string) => void
    ) => void;
    rtcStartStream: (rtc: RTCClient) => Promise<void>;
  }

  const severus: Severus;

  export = severus;
}
