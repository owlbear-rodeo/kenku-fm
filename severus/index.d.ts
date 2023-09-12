declare module "severus" {
  export interface IpDiscovery {
    address: string;
    port: number;
  }
  export interface VoiceConnection {}
  export interface Stream {}
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
      broadcast: Broadcast
    ) => Promise<void>;
    voiceConnectionDisconnect: (
      voiceConnection: VoiceConnection
    ) => Promise<void>;
    streamNew: (broadcast: Broadcast) => Promise<Stream>;
    streamGetPort: (stream: Stream) => number;
    streamStop: (stream: Stream) => void;
    logInit: () => void;
    logSetLogLevel: (level: string) => void;
    logOnLog: (onLog: (level: string, message: string) => void) => void;
    broadcastNew: () => Broadcast;
  }

  const severus: Severus;

  export = severus;
}
