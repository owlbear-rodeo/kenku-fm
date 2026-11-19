import { afterEach, describe, expect, it, vi } from "vitest";
import { catalog, deferred, fakeDiscord, fakeVoice, FAKE_DISCORD_SECRET } from "../fixtures/discord";
import { MAX_DISCORD_NETWORK_WORK } from "../../src/dungeonJockey/adapters/kenku/DiscordOutput";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("main Discord transport", () => {
  it("uses one bot, retains multiple guilds, switches one guild, and ignores stale leave", async () => {
    const { output, client, createClient, voices, player } = fakeDiscord();
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(true);
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(true);
    expect(createClient).toHaveBeenCalledOnce();
    expect(client.login).toHaveBeenCalledExactlyOnceWith(FAKE_DISCORD_SECRET);
    expect(await output.join("1", "11")).toBe(true);
    expect(await output.join("2", "21")).toBe(true);
    expect(await output.join("1", "12")).toBe(true);
    output.leave("1", "11");
    expect(output.snapshot().destinations).toEqual([
      { guildId: "2", channelId: "21", state: "ready" }, { guildId: "1", channelId: "12", state: "ready" },
    ]);
    expect(voices[0].destroy).toHaveBeenCalledOnce();
    expect(voices[1].destroy).not.toHaveBeenCalled();
    expect(player.stop).not.toHaveBeenCalled();
    output.disconnect(); output.disconnect();
    expect(client.destroy).toHaveBeenCalledOnce();
    expect(voices[1].destroy).toHaveBeenCalledOnce();
    expect(voices[2].destroy).toHaveBeenCalledOnce();
    expect(player.stop).not.toHaveBeenCalled();
    output.dispose(); output.dispose();
    expect(player.stop).toHaveBeenCalledOnce();
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(false);
  });

  it("isolates SDK, destination and player errors without logging arbitrary exceptions", async () => {
    const log = vi.spyOn(console, "error");
    const { output, client, voices, player, fail } = fakeDiscord();
    await output.connect(FAKE_DISCORD_SECRET);
    await output.join("1", "11"); await output.join("2", "21");
    vi.mocked(client.prepare).mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    expect(await output.join("1", "12")).toBe(false);
    expect(voices[0].destroy).not.toHaveBeenCalled();
    voices[0].fail();
    expect(output.snapshot().destinations).toContainEqual({ guildId: "2", channelId: "21", state: "ready" });
    expect(voices[1].destroy).not.toHaveBeenCalled();
    player.emit("error", new Error(FAKE_DISCORD_SECRET));
    expect(output.snapshot().failure).toBe("audio");
    expect(JSON.stringify(output.snapshot())).not.toContain(FAKE_DISCORD_SECRET);
    expect(player.stop).not.toHaveBeenCalled();
    fail();
    expect(output.snapshot().state).toBe("disconnected");
    expect(log).not.toHaveBeenCalled();
    output.dispose();
  });

  it.each(["login", "catalog"] as const)("bounds %s, releases admission and rejects late completion", async (stage) => {
    vi.useFakeTimers();
    const { output, client, createClient } = fakeDiscord();
    const pending = deferred<never>();
    vi.mocked(client[stage]).mockImplementationOnce(() => pending.promise);
    const connected = output.connect(FAKE_DISCORD_SECRET);
    await vi.advanceTimersByTimeAsync(1);
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(await connected).toBe(false);
    expect(output.snapshot().state).toBe("disconnected");
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(true);
    pending.resolve((stage === "catalog" ? catalog : undefined) as never);
    await vi.advanceTimersByTimeAsync(0);
    expect(createClient).toHaveBeenCalledTimes(2);
    expect(output.snapshot().state).toBe("ready");
    output.dispose();
  });

  it.each(["disconnect", "dispose"] as const)("cancels stalled login on %s without waiting for network", async (command) => {
    const { output, client } = fakeDiscord();
    const pending = deferred<void>();
    vi.mocked(client.login).mockReturnValueOnce(pending.promise);
    const connected = output.connect(FAKE_DISCORD_SECRET);
    output[command]();
    expect(await connected).toBe(false);
    pending.resolve(); await Promise.resolve();
    expect(client.catalog).not.toHaveBeenCalled();
    expect(output.snapshot().state).toBe("disconnected");
    output.dispose();
  });

  it("bounds joins, releases busy admission, and ignores superseded prepared channels", async () => {
    vi.useFakeTimers();
    const { output, client } = fakeDiscord();
    await output.connect(FAKE_DISCORD_SECRET);
    const pending = deferred<() => ReturnType<typeof fakeVoice>>();
    vi.mocked(client.prepare).mockReturnValueOnce(pending.promise);
    const joined = output.join("1", "11");
    expect(await output.join("2", "21")).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(await joined).toBe(false);
    expect(await output.join("2", "21")).toBe(true);
    const create = vi.fn(fakeVoice); pending.resolve(create);
    await vi.advanceTimersByTimeAsync(0);
    expect(create).not.toHaveBeenCalled();
    expect(output.snapshot().destinations).toHaveLength(1);
    output.dispose();
  });

  it("restores the prior channel after a failed same-guild move and keeps the other guild", async () => {
    const { output, client, voices } = fakeDiscord();
    await output.connect(FAKE_DISCORD_SECRET);
    await output.join("1", "11"); await output.join("2", "21");
    const failed = fakeVoice(); failed.ready.mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    vi.mocked(client.prepare).mockResolvedValueOnce(() => failed);
    expect(await output.join("1", "12")).toBe(false);
    expect(output.snapshot().destinations).toEqual([
      { guildId: "2", channelId: "21", state: "ready" }, { guildId: "1", channelId: "11", state: "ready" },
    ]);
    expect(voices[1].destroy).not.toHaveBeenCalled();
    output.dispose();
  });

  it("cancels a pending join with Leave and cannot restore it after completion", async () => {
    const { output, client } = fakeDiscord();
    await output.connect(FAKE_DISCORD_SECRET);
    const prepared = deferred<() => ReturnType<typeof fakeVoice>>();
    vi.mocked(client.prepare).mockReturnValueOnce(prepared.promise);
    const joining = output.join("1", "11");
    await Promise.resolve();
    output.leave("1", "11");
    expect(await joining).toBe(false);
    const create = vi.fn(fakeVoice); prepared.resolve(create);
    await Promise.resolve(); await Promise.resolve();
    expect(create).not.toHaveBeenCalled(); expect(output.snapshot().destinations).toEqual([]);
    output.dispose();
  });

  it("caps abandoned SDK promises and readmits commands only when network work settles", async () => {
    vi.useFakeTimers();
    const { output, client } = fakeDiscord();
    const stalled = deferred<void>();
    vi.mocked(client.login).mockImplementation(() => stalled.promise);
    for (let index = 0; index < MAX_DISCORD_NETWORK_WORK; index++) {
      const result = output.connect(FAKE_DISCORD_SECRET);
      await vi.advanceTimersByTimeAsync(101); expect(await result).toBe(false);
    }
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(false);
    expect(client.login).toHaveBeenCalledTimes(MAX_DISCORD_NETWORK_WORK);
    stalled.resolve(); await vi.advanceTimersByTimeAsync(0);
    vi.mocked(client.login).mockResolvedValue(undefined);
    expect(await output.connect(FAKE_DISCORD_SECRET)).toBe(true);
    output.dispose();
  });

  it("discards a late rollback completion after Disconnect", async () => {
    const restore = deferred<void>();
    const rollbackVoice = fakeVoice(); rollbackVoice.ready.mockReturnValue(restore.promise);
    let count = 0;
    const { output, client } = fakeDiscord(() => ++count === 1 ? fakeVoice() : rollbackVoice);
    await output.connect(FAKE_DISCORD_SECRET); await output.join("1", "11");
    const failed = fakeVoice(); failed.ready.mockRejectedValue(new Error(FAKE_DISCORD_SECRET));
    vi.mocked(client.prepare).mockResolvedValueOnce(() => failed);
    const joining = output.join("1", "12");
    await vi.waitFor(() => expect(rollbackVoice.ready).toHaveBeenCalled());
    output.disconnect(); restore.resolve(); await joining;
    expect(output.snapshot()).toMatchObject({ state: "disconnected", destinations: [], failure: "none" });
    output.dispose();
  });
});
