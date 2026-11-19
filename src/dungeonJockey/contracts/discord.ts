import { parseCredentialPersistence, MAX_CREDENTIAL_SECRET_BYTES } from "./credentials";
import { parseRequestId, RequestId } from "../domain/ids/ids";
import { SecretPersistence } from "../ports/SecretStorePort";

export const DISCORD_OPERATIONS = Object.freeze({
  configuration: "application.getDiscordConfiguration",
  configure: "application.configureDiscord",
  forget: "application.forgetDiscord",
  status: "application.getDiscordStatus",
  connect: "application.connectDiscord",
  disconnect: "application.disconnectDiscord",
  join: "application.joinDiscordChannel",
  leave: "application.leaveDiscordChannel",
} as const);
export const DISCORD_CHANNELS = Object.freeze({
  configuration: "dungeon-jockey:v1:discord-configuration",
  configure: "dungeon-jockey:v1:configure-discord",
  forget: "dungeon-jockey:v1:forget-discord",
  status: "dungeon-jockey:v1:discord-status",
  connect: "dungeon-jockey:v1:connect-discord",
  disconnect: "dungeon-jockey:v1:disconnect-discord",
  join: "dungeon-jockey:v1:join-discord-channel",
  leave: "dungeon-jockey:v1:leave-discord-channel",
});
export type DiscordOperation = keyof typeof DISCORD_OPERATIONS;
export type DiscordConfiguration = { state: "configured" | "missing" | "unavailable"; persistence: SecretPersistence };
export type DiscordGuild = { id: string; name: string; voiceChannels: { id: string; name: string }[] };
export type DiscordSnapshot = {
  sequence: number;
  state: "disconnected" | "connecting" | "ready";
  guilds: DiscordGuild[];
  destinations: { guildId: string; channelId: string; state: "connecting" | "ready" | "failed" }[];
  failure: "none" | "connection" | "destination" | "audio";
};
export type DiscordResult = {
  protocolVersion: 1; type: typeof DISCORD_OPERATIONS[DiscordOperation]; id: RequestId | null;
} & ({ ok: true; configuration?: DiscordConfiguration; snapshot?: DiscordSnapshot } |
  { ok: false; error: { code: string; message: string; retryable: boolean } });

export function discordFields(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== keys.length) throw new Error("Invalid Discord contract");
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) throw new Error("Invalid Discord contract");
    fields[key] = descriptor.value;
  }
  return fields;
}
export function discordId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9]{1,20}$/.test(value)) throw new Error("Invalid Discord identifier");
  return value;
}
export function parseDiscordRequest(value: unknown, operation: DiscordOperation) {
  const record = discordFields(value, ["id", "type", "protocolVersion", "payload"]);
  if (typeof record.id !== "string" || record.id.length !== 36 || record.protocolVersion !== 1 || record.type !== DISCORD_OPERATIONS[operation]) throw new Error("Invalid Discord request");
  const id = parseRequestId(record.id);
  const payload = discordFields(record.payload, operation === "configure" ? ["secret"] :
    operation === "join" || operation === "leave" ? ["guildId", "channelId"] : []);
  if (operation === "configure") {
    if (typeof payload.secret !== "string" || !payload.secret.length || payload.secret.length > MAX_CREDENTIAL_SECRET_BYTES ||
        new TextEncoder().encode(payload.secret).length > MAX_CREDENTIAL_SECRET_BYTES) throw new Error("Invalid Discord secret");
  }
  if (operation === "join" || operation === "leave") {
    discordId(payload.guildId); discordId(payload.channelId);
  }
  return { id, payload };
}
export function projectConfiguration(value: DiscordConfiguration): DiscordConfiguration {
  if (!["configured", "missing", "unavailable"].includes(value.state)) throw new Error("Invalid configuration");
  return { state: value.state, persistence: parseCredentialPersistence(value.persistence) };
}
export const MAX_DISCORD_GUILDS = 100;
export const MAX_DISCORD_CHANNELS = 100;
export function projectDiscordSnapshot(value: DiscordSnapshot): DiscordSnapshot {
  const name = (value: unknown): string => {
    if (typeof value !== "string" || value.length > 100) throw new Error("Invalid Discord metadata");
    return value;
  };
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0 ||
      !["disconnected", "connecting", "ready"].includes(value.state) ||
      !["none", "connection", "destination", "audio"].includes(value.failure) ||
      !Array.isArray(value.guilds) || value.guilds.length > MAX_DISCORD_GUILDS ||
      !Array.isArray(value.destinations) || value.destinations.length > MAX_DISCORD_GUILDS) throw new Error("Invalid Discord snapshot");
  return { sequence: value.sequence, state: value.state, failure: value.failure,
    guilds: value.guilds.map((guild) => {
      if (!Array.isArray(guild.voiceChannels) || guild.voiceChannels.length > MAX_DISCORD_CHANNELS) throw new Error("Invalid Discord catalog");
      return { id: discordId(guild.id), name: name(guild.name), voiceChannels: guild.voiceChannels.map((channel) => ({ id: discordId(channel.id), name: name(channel.name) })) };
    }), destinations: value.destinations.map((destination) => {
      if (!["connecting", "ready", "failed"].includes(destination.state)) throw new Error("Invalid destination");
      return { guildId: discordId(destination.guildId), channelId: discordId(destination.channelId), state: destination.state };
    }),
  };
}
