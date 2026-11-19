import type { DiscordSnapshot } from "../contracts/discord";

/** Main-only capability. The renderer connect command accepts no credential. */
export interface DiscordOutputPort {
  connect(secret: string): Promise<boolean>;
  disconnect(): void;
  join(guildId: string, channelId: string): Promise<boolean>;
  leave(guildId: string, channelId: string): void;
  snapshot(): DiscordSnapshot;
  dispose(): void;
}
