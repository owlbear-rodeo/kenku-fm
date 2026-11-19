import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDiscordSelection } from "../../src/dungeonJockey/adapters/secrets/discordSelection";
import { createProtectedSecretStore } from "../../src/dungeonJockey/adapters/secrets/protectedSecretStore";
import { createSessionSecretStore } from "../../src/dungeonJockey/adapters/secrets/sessionSecretStore";
import { DiscordConfigurationService } from "../../src/dungeonJockey/main/DiscordConfigurationService";
import { deferred, fakeDiscord, FAKE_DISCORD_SECRET } from "../fixtures/discord";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks(); vi.useRealTimers();
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
async function setup(platform = "win32") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "discord-configuration-")); roots.push(root);
  const protection = {
    isAsyncEncryptionAvailable: vi.fn(async () => true),
    encryptStringAsync: vi.fn(async (secret: string) => Buffer.from(`fixture:${secret}`)),
    decryptStringAsync: vi.fn(async (bytes: Buffer) => ({ result: bytes.toString().slice(8), shouldReEncrypt: false })),
  };
  const store = platform === "linux" ? createSessionSecretStore() : createProtectedSecretStore(root, protection);
  const selection = createDiscordSelection(root, platform);
  const { output, client, createClient } = fakeDiscord();
  const persistence = platform === "linux" ? "session-only" : "remembered";
  const service = new DiscordConfigurationService(selection, () => store, output, persistence);
  return { root, protection, store, selection, service, output, client, createClient, persistence };
}
describe("selected Discord credential", () => {
  it.each(["win32", "darwin"])("reconstructs %s selection and protected record, replaces atomically, and forgets", async (platform) => {
    const { root, store, selection, service, protection, output } = await setup(platform);
    expect(await service.status()).toEqual({ state: "missing", persistence: "remembered" });
    expect(await service.configure(FAKE_DISCORD_SECRET)).toBe(true);
    const id = await selection.read();
    expect(await service.configure("fake-replacement")).toBe(true);
    expect(await selection.read()).toBe(id);
    const restarted = new DiscordConfigurationService(createDiscordSelection(root, platform),
      () => createProtectedSecretStore(root, protection), output, "remembered");
    expect(await restarted.status()).toEqual({ state: "configured", persistence: "remembered" });
    expect(await fs.readFile(path.join(root, "discord-configuration.json"), "utf8")).toBe(JSON.stringify({ version: 1, credentialId: id }));
    expect(await restarted.forget()).toBe(true);
    expect(await store.status(id)).toMatchObject({ state: "missing" });
    expect(await selection.read()).toBeNull();
    service.dispose();
  });
  it("Linux writes neither selection nor secret and resets at process restart", async () => {
    const { root, service, output } = await setup("linux");
    await service.configure(FAKE_DISCORD_SECRET);
    expect(await service.status()).toEqual({ state: "configured", persistence: "session-only" });
    expect(await fs.readdir(root)).toEqual([]);
    const restarted = new DiscordConfigurationService(createDiscordSelection(root, "linux"), () => createSessionSecretStore(), output, "session-only");
    expect(await restarted.status()).toEqual({ state: "missing", persistence: "session-only" });
    service.dispose();
  });
  it.each(["configure", "forget"] as const)("fails %s closed on malformed selection metadata without changing the credential", async (operation) => {
    const { root, service, selection, store } = await setup();
    await service.configure(FAKE_DISCORD_SECRET);
    const id = await selection.read();
    const file = path.join(root, "discord-configuration.json");
    const mutations = [vi.spyOn(selection, "write"), vi.spyOn(store, "store"), vi.spyOn(store, "replace"), vi.spyOn(store, "forget")];
    for (const malformed of ["unreadable fixture", JSON.stringify({ version: 2, credentialId: id })]) {
      await fs.writeFile(file, malformed);
      expect((await service.status()).state).toBe("unavailable");
      expect(await service.connect()).toBe(false);
      const result = operation === "configure" ? await service.configure("fake-replacement") : await service.forget();
      expect(result).toBe(false);
      expect(await fs.readFile(file, "utf8")).toBe(malformed);
      for (const mutation of mutations) expect(mutation).not.toHaveBeenCalled();
      const consumer = vi.fn();
      expect(await store.use(id, consumer)).toMatchObject({ ok: true });
      expect(consumer).toHaveBeenCalledExactlyOnceWith(FAKE_DISCORD_SECRET);
    }
    service.dispose();
  });
  it.each(["configure", "forget"] as const)("preserves selection and secret on transient %s read failure, then permits retry", async (operation) => {
    const { root, service, selection, store } = await setup();
    await service.configure(FAKE_DISCORD_SECRET);
    const id = await selection.read();
    const file = path.join(root, "discord-configuration.json");
    const before = await fs.readFile(file, "utf8");
    const mutations = [vi.spyOn(selection, "write"), vi.spyOn(store, "store"), vi.spyOn(store, "replace"), vi.spyOn(store, "forget")];
    const logs = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")];
    vi.spyOn(selection, "read").mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    const run = () => operation === "configure" ? service.configure("fake-replacement") : service.forget();
    expect(await run()).toBe(false);
    expect(await fs.readFile(file, "utf8")).toBe(before);
    for (const mutation of mutations) expect(mutation).not.toHaveBeenCalled();
    for (const log of logs) expect(log).not.toHaveBeenCalled();
    const consumer = vi.fn();
    expect(await store.use(id, consumer)).toMatchObject({ ok: true });
    expect(consumer).toHaveBeenCalledExactlyOnceWith(FAKE_DISCORD_SECRET);
    expect(await selection.read()).toBe(id);
    expect((await service.status()).state).toBe("configured");
    expect(await run()).toBe(true);
    if (operation === "configure") {
      expect(await selection.read()).toBe(id);
      const replacement = vi.fn();
      await store.use(id, replacement);
      expect(replacement).toHaveBeenCalledExactlyOnceWith("fake-replacement");
      expect(mutations[1]).not.toHaveBeenCalled();
    } else {
      expect(await selection.read()).toBeNull();
      expect((await store.status(id)).state).toBe("missing");
    }
    service.dispose();
  });
  it("preserves selected records through provider failure, failed replacement and recovery", async () => {
    const { service, selection, protection, store } = await setup();
    await service.configure(FAKE_DISCORD_SECRET); const id = await selection.read();
    protection.isAsyncEncryptionAvailable.mockResolvedValue(false);
    expect((await service.status()).state).toBe("unavailable");
    expect(await service.configure("fake-replacement")).toBe(false);
    expect(await selection.read()).toBe(id);
    protection.isAsyncEncryptionAvailable.mockResolvedValue(true);
    expect((await service.status()).state).toBe("configured");
    const used: string[] = []; await store.use(id, (secret) => { used.push(secret); });
    expect(used).toEqual([FAKE_DISCORD_SECRET]);
    await store.forget(id);
    expect((await service.status()).state).toBe("missing");
    expect(await service.configure("fake-replacement")).toBe(true);
    service.dispose();
  });
  it("cleans up new records after publication failure, preserving a missing selected reference", async () => {
    const { service, selection, store } = await setup();
    await service.configure(FAKE_DISCORD_SECRET); const id = await selection.read(); await store.forget(id);
    const save = vi.spyOn(store, "store"); const forget = vi.spyOn(store, "forget");
    vi.spyOn(selection, "write").mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    expect(await service.configure("fake-replacement")).toBe(false);
    const created = await save.mock.results[0].value;
    expect(forget).toHaveBeenCalledWith(created.id);
    expect(await selection.read()).toBe(id);
    expect((await store.status(created.id)).state).toBe("missing");
    service.dispose();
  });
  it("fails Forget safely at deletion and at selection clear; both can be retried", async () => {
    const { service, selection, store, output } = await setup();
    await service.configure(FAKE_DISCORD_SECRET); const id = await selection.read(); await service.connect();
    vi.spyOn(store, "forget").mockResolvedValueOnce({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(await service.forget()).toBe(false);
    expect(output.snapshot().state).toBe("disconnected");
    expect(await selection.read()).toBe(id);
    expect((await service.status()).state).toBe("configured");
    vi.spyOn(selection, "write").mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    expect(await service.forget()).toBe(false);
    expect(await selection.read()).toBe(id);
    expect((await service.status()).state).toBe("missing");
    expect(await service.forget()).toBe(true);
    service.dispose();
  });
  it("logs in at most once at startup and UI refresh/status never undoes Disconnect", async () => {
    const { service, client, output } = await setup();
    await service.configure(FAKE_DISCORD_SECRET);
    await service.startup(); await service.startup();
    expect(client.login).toHaveBeenCalledOnce();
    service.disconnect(); await service.status(); output.snapshot(); await service.startup();
    expect(client.login).toHaveBeenCalledOnce();
    expect(output.snapshot().state).toBe("disconnected");
    service.dispose();
  });
  it("cancels pending decrypt-and-connect, releases command admission, and rejects late plaintext", async () => {
    const { service, store, client } = await setup();
    await service.configure(FAKE_DISCORD_SECRET);
    const pending = deferred<void>();
    vi.spyOn(store, "use").mockImplementationOnce(async (_id, consumer) => { await pending.promise; await consumer(FAKE_DISCORD_SECRET); return { ok: true, persistence: "remembered" }; });
    const connected = service.connect();
    await vi.waitFor(() => expect(store.use).toHaveBeenCalled());
    service.disconnect(); expect(await connected).toBe(false);
    pending.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(client.login).not.toHaveBeenCalled();
    await vi.waitFor(async () => expect(await service.connect()).toBe(true));
    service.dispose();
  });
});
