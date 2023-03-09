declare module "severus" {
  export interface VoiceChannel {
    id: string;
    name: string;
  }
  export interface Guild {
    id: string;
    name: string;
    icon: string;
    voiceChannels: VoiceChannel[];
  }
  export interface DiscordClient {}
  export interface Severus {
    discordNew: (token: string) => Promise<DiscordClient>;
    discordGetInfo: (client: DiscordClient) => Promise<Guild[]>;
  }

  const severus: Severus;

  export = severus;
}
