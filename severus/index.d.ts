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
      guildId: string,
      channelId: string
    ) => Promise<void>;
    discordLeave: (client: DiscordClient, guildId: string) => Promise<void>;
    rtcNew: () => Promise<RTCClient>;
    rtcSignal: (rtc: RTCClient, offer: string) => Promise<string>;
    rtcStartRecorder: (rtc: RTCClient, fileName: string) => Promise<void>;
    rtcClose: (rtc: RTCClient) => Promise<void>;
  }

  const severus: Severus;

  export = severus;
}
