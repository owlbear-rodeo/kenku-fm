import { Client, GatewayIntentBits } from "discord.js";
import { createAudioPlayer, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus } from "@discordjs/voice";
import { DiscordGuild, MAX_DISCORD_CHANNELS, MAX_DISCORD_GUILDS } from "../../dungeonJockey/contracts/discord";

export interface DiscordVoice {
  ready(signal: AbortSignal): Promise<void>;
  onFailure(callback: () => void): void;
  destroy(): void;
}
export interface DiscordClient {
  login(secret: string): Promise<unknown>;
  catalog(signal: AbortSignal): Promise<DiscordGuild[]>;
  prepare(guildId: string, channelId: string): Promise<() => DiscordVoice>;
  onFailure(callback: () => void): void;
  destroy(): void;
}

/** Retained SDK/player mechanics only. No Electron, IPC, renderer or token cache. */
export class DiscordBroadcast {
  readonly audioPlayer = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play, maxMissedFrames: 3000 },
  });
  createClient(): DiscordClient {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], rest: { timeout: 10_000, retries: 0 } });
    let fail = () => {};
    client.on("error", () => fail());
    client.on("shardDisconnect", () => fail());
    return {
      login: (secret) => client.login(secret),
      onFailure: (callback) => { fail = callback; },
      destroy: () => { void client.destroy().catch(() => {}); },
      async catalog(signal) {
        const raw = await client.guilds.fetch();
        const guilds: DiscordGuild[] = [];
        // Sequential, capped discovery prevents unbounded network fan-out.
        for (const base of Array.from(raw.values()).slice(0, MAX_DISCORD_GUILDS)) {
          if (signal.aborted) throw new Error("Discord operation cancelled");
          const guild = await base.fetch();
          if (signal.aborted) throw new Error("Discord operation cancelled");
          const channels = await guild.channels.fetch();
          guilds.push({ id: guild.id, name: guild.name.slice(0, 100), voiceChannels:
            Array.from(channels.values()).filter((channel) => channel?.isVoiceBased())
              .sort((a, b) => a.rawPosition - b.rawPosition).slice(0, MAX_DISCORD_CHANNELS)
              .map((channel) => ({ id: channel.id, name: channel.name.slice(0, 100) })),
          });
        }
        return guilds;
      },
      prepare: async (guildId, channelId) => {
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isVoiceBased() || channel.guild.id !== guildId || !channel.joinable) throw new Error("Discord destination unavailable");
        return () => {
          const connection = joinVoiceChannel({ channelId, guildId, adapterCreator: channel.guild.voiceAdapterCreator });
          connection.subscribe(this.audioPlayer);
          let failure = () => {};
          const state = (_old: unknown, next: { status: string }) => {
            if (next.status === VoiceConnectionStatus.Disconnected || next.status === VoiceConnectionStatus.Destroyed) failure();
          };
          connection.on("error", () => failure());
          connection.on("stateChange", state);
          return {
            ready: async (signal) => { await entersState(connection, VoiceConnectionStatus.Ready, signal); },
            onFailure: (callback) => { failure = callback; },
            destroy: () => {
              failure = () => {};
              connection.off("stateChange", state);
              if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            },
          };
        };
      },
    };
  }
}
