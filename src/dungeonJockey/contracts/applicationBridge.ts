import type { CredentialId } from "../domain/ids/CredentialId";
import type { CredentialResult } from "./credentials";
import type { VersionResult } from "./version";
import type { DiscordResult } from "./discord";

export interface ApplicationBridge {
  getDiscordConfiguration(): Promise<DiscordResult>;
  configureDiscord(secret: string): Promise<DiscordResult>;
  forgetDiscord(): Promise<DiscordResult>;
  getDiscordStatus(): Promise<DiscordResult>;
  connectDiscord(): Promise<DiscordResult>;
  disconnectDiscord(): Promise<DiscordResult>;
  joinDiscordChannel(guildId: string, channelId: string): Promise<DiscordResult>;
  leaveDiscordChannel(guildId: string, channelId: string): Promise<DiscordResult>;
  getVersion(): Promise<VersionResult>;
  storeCredential(secret: string): Promise<CredentialResult<"store">>;
  getCredentialStatus(id: CredentialId): Promise<CredentialResult<"status">>;
  replaceCredential(id: CredentialId, secret: string): Promise<CredentialResult<"replace">>;
  forgetCredential(id: CredentialId): Promise<CredentialResult<"forget">>;
}
