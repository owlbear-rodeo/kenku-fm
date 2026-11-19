import type { AudioPlayer } from "@discordjs/voice";
import type { DiscordClient, DiscordVoice } from "../../../main/broadcast/DiscordBroadcast";
import { DiscordSnapshot, projectDiscordSnapshot } from "../../contracts/discord";
import type { DiscordOutputPort } from "../../ports/DiscordOutputPort";

export const DISCORD_NETWORK_TIMEOUT_MS = 15_000;
export const MAX_DISCORD_NETWORK_WORK = 4;
type Destination = { channelId: string; voice: DiscordVoice; restore: () => DiscordVoice; state: "connecting" | "ready" | "failed" };

/** Shared main-lifetime adapter around the retained SDK mechanics and player. */
export class DiscordOutput implements DiscordOutputPort {
  private client: DiscordClient | undefined;
  private attempt: AbortController | undefined;
  private joining: AbortController | undefined;
  private joiningTarget: { guildId: string; channelId: string } | undefined;
  private disposed = false;
  private networkWork = 0;
  private destinations = new Map<string, Destination>();
  private state: DiscordSnapshot = { sequence: 0, state: "disconnected", guilds: [], destinations: [], failure: "none" };
  constructor(private readonly createClient: () => DiscordClient, readonly audioPlayer: AudioPlayer,
    private readonly timeout = DISCORD_NETWORK_TIMEOUT_MS) {
    audioPlayer.on("error", this.audioFailure);
  }
  private audioFailure = () => { this.state.failure = "audio"; this.state.sequence++; };
  private async bounded<T>(controller: AbortController, work: () => Promise<T>): Promise<T> {
    if (controller.signal.aborted || this.networkWork >= MAX_DISCORD_NETWORK_WORK) throw new Error("Discord busy");
    this.networkWork++;
    const pending = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new Error("Discord operation cancelled");
      return work();
    }).finally(() => { this.networkWork--; });
    let timer: ReturnType<typeof setTimeout>;
    let abort: () => void;
    const cancelled = new Promise<never>((_resolve, reject) => {
      abort = () => reject(new Error("Discord operation cancelled"));
      controller.signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => controller.abort(), this.timeout);
    });
    // SDK promises may ignore cancellation. Retain a bounded slot until their
    // underlying work settles, even after the caller's deadline has expired.
    try { return await Promise.race([pending, cancelled]); }
    finally { clearTimeout(timer); controller.signal.removeEventListener("abort", abort); }
  }
  snapshot(): DiscordSnapshot {
    return projectDiscordSnapshot({ ...this.state, destinations: Array.from(this.destinations, ([guildId, d]) => ({ guildId, channelId: d.channelId, state: d.state })) });
  }
  private destroyClient(client: DiscordClient | undefined) { try { client?.destroy(); } catch { /* fixed projection only */ } }
  private destroyVoice(voice: DiscordVoice | undefined) { try { voice?.destroy(); } catch { /* fixed projection only */ } }
  disconnect(): void {
    this.attempt?.abort(); this.attempt = undefined;
    this.joining?.abort(); this.joining = undefined;
    this.joiningTarget = undefined;
    const destinations = Array.from(this.destinations.values());
    this.destinations.clear();
    for (const destination of destinations) this.destroyVoice(destination.voice);
    const client = this.client; this.client = undefined;
    this.destroyClient(client);
    this.state = { sequence: this.state.sequence + 1, state: "disconnected", guilds: [], destinations: [], failure: "none" };
    // Capture and Local Output continue independently of bot lifetime.
  }
  async connect(secret: string): Promise<boolean> {
    if (this.disposed) return false;
    if (this.state.state === "ready") return true;
    if (this.attempt) return false;
    this.disconnect();
    const attempt = new AbortController(); this.attempt = attempt;
    let client: DiscordClient;
    this.state.state = "connecting"; this.state.sequence++;
    try {
      client = this.createClient(); this.client = client;
      client.onFailure(() => {
        if (this.client !== client) return;
        this.disconnect(); this.state.failure = "connection";
      });
      const guilds = await this.bounded(attempt, async () => {
        await client.login(secret);
        if (attempt.signal.aborted) { this.destroyClient(client); throw new Error("Cancelled"); }
        return client.catalog(attempt.signal);
      });
      if (attempt.signal.aborted || this.client !== client) return false;
      this.state = projectDiscordSnapshot({ ...this.state, guilds, state: "ready", sequence: this.state.sequence + 1 });
      return true;
    } catch {
      if (this.client === client) { this.disconnect(); this.state.failure = "connection"; }
      return false;
    } finally { if (this.attempt === attempt) this.attempt = undefined; }
  }
  private watch(guildId: string, destination: Destination) {
    destination.voice.onFailure(() => {
      if (this.destinations.get(guildId) !== destination || destination.state === "failed") return;
      destination.state = "failed";
      this.destroyVoice(destination.voice);
      this.state.failure = "destination"; this.state.sequence++;
    });
  }
  async join(guildId: string, channelId: string): Promise<boolean> {
    if (!this.client || this.state.state !== "ready" || this.joining || this.disposed ||
        !this.state.guilds.some((g) => g.id === guildId && g.voiceChannels.some((c) => c.id === channelId))) return false;
    const previous = this.destinations.get(guildId);
    if (previous?.channelId === channelId && previous.state === "ready") return true;
    const client = this.client;
    const attempt = new AbortController(); this.joining = attempt;
    this.joiningTarget = { guildId, channelId };
    let current: Destination | undefined;
    let moved = false;
    try {
      await this.bounded(attempt, async () => {
        const create = await client.prepare(guildId, channelId);
        if (attempt.signal.aborted || this.client !== client) return;
        this.destinations.delete(guildId);
        this.destroyVoice(previous?.voice); moved = true;
        current = { channelId, voice: create(), restore: create, state: "connecting" };
        this.destinations.set(guildId, current);
        this.state.sequence++;
        this.watch(guildId, current);
        await current.voice.ready(attempt.signal);
      });
      if (attempt.signal.aborted || this.client !== client || !current || current.state === "failed" || this.destinations.get(guildId) !== current) throw new Error("Cancelled");
      current.state = "ready";
      this.state.failure = "none"; this.state.sequence++;
      return true;
    } catch {
      if (this.client === client && this.joining === attempt) {
        if (current && this.destinations.get(guildId) === current) { this.destinations.delete(guildId); this.destroyVoice(current.voice); }
        if (moved && previous) {
          try {
            previous.voice = previous.restore();
            previous.state = "connecting";
            this.destinations.set(guildId, previous); this.watch(guildId, previous);
            const rollback = new AbortController();
            // Rollback is part of this explicit move, not a reconnect scheduler.
            const timer = setTimeout(() => rollback.abort(), 2000);
            try {
              await this.bounded(rollback, () => previous.voice.ready(rollback.signal));
              if (this.destinations.get(guildId) === previous && this.client === client) previous.state = "ready";
            } catch {
              if (this.destinations.get(guildId) === previous) { previous.state = "failed"; this.destroyVoice(previous.voice); }
            } finally { clearTimeout(timer); }
          } catch { previous.state = "failed"; this.destinations.set(guildId, previous); }
        }
        if (this.client === client && this.joining === attempt) {
          this.state.failure = "destination"; this.state.sequence++;
        }
      }
      return false;
    } finally { if (this.joining === attempt) { this.joining = undefined; this.joiningTarget = undefined; } }
  }
  leave(guildId: string, channelId: string): void {
    if (this.joiningTarget?.guildId === guildId && this.joiningTarget.channelId === channelId) {
      this.joining?.abort(); this.joining = undefined; this.joiningTarget = undefined;
    }
    const destination = this.destinations.get(guildId);
    if (destination?.channelId !== channelId) return;
    this.destinations.delete(guildId); this.destroyVoice(destination.voice); this.state.sequence++;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.disconnect();
    this.audioPlayer.off("error", this.audioFailure);
    // Teardown can emit a late stream error. Keep a non-reporting sink on the
    // retired player rather than turning it into an uncaught SDK exception.
    this.audioPlayer.on("error", () => {});
    this.audioPlayer.stop();
  }
}
