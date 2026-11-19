import { EventEmitter } from "events";
import type { AudioPlayer } from "@discordjs/voice";
import { vi } from "vitest";
import type { DiscordClient, DiscordVoice } from "../../src/main/broadcast/DiscordBroadcast";
import { DiscordOutput } from "../../src/dungeonJockey/adapters/kenku/DiscordOutput";

export const FAKE_DISCORD_SECRET = "fake-discord-secret-for-tests-only";
export const catalog = [
  { id: "1", name: "First <guild>", voiceChannels: [{ id: "11", name: "One" }, { id: "12", name: "Two" }] },
  { id: "2", name: "Second", voiceChannels: [{ id: "21", name: "Three" }] },
];
export function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function fakeVoice() {
  let failure = () => {};
  return { ready: vi.fn(async () => {}), destroy: vi.fn(),
    onFailure: (callback: () => void) => { failure = callback; }, fail: () => failure() };
}
export function fakeDiscord(makeVoice = fakeVoice) {
  let failure = () => {};
  const voices: ReturnType<typeof fakeVoice>[] = [];
  const client: DiscordClient = {
    login: vi.fn(async () => {}), catalog: vi.fn(async () => catalog),
    prepare: vi.fn(async () => (): DiscordVoice => { const voice = makeVoice(); voices.push(voice); return voice; }),
    destroy: vi.fn(), onFailure: (callback) => { failure = callback; },
  };
  const player = Object.assign(new EventEmitter(), { play: vi.fn(), stop: vi.fn() });
  const createClient = vi.fn(() => client);
  const output = new DiscordOutput(createClient, player as unknown as AudioPlayer, 100);
  return { client, player, output, voices, createClient, fail: () => failure() };
}
