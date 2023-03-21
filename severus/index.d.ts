declare module "severus" {
  export interface VoiceChannel {
    id: number;
    name: string;
  }
  export interface Guild {
    id: number;
    name: string;
    icon: string;
    voiceChannels: VoiceChannel[];
  }
  export interface DiscordClient {}
  export interface RTCClient {}
  export interface Severus {
    discordNew: (token: string) => Promise<DiscordClient>;
    discordGetInfo: (client: DiscordClient) => Promise<Guild[]>;
    discordJoin: (
      client: DiscordClient,
      rtc: RTCClient,
      guildId: string,
      channelId: string
    ) => Promise<void>;
    discordLeave: (client: DiscordClient, guildId: string) => Promise<void>;
    discordDestroy: (client: DiscordClient) => void;
    rtcNew: () => Promise<RTCClient>;
    rtcSignal: (rtc: RTCClient, offer: string) => Promise<string>;
    rtcStartStream: (rtc: RTCClient) => Promise<void>;
  }

  const severus: Severus;

  export = severus;
}
