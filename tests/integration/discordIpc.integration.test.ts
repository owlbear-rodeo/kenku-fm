import type { IpcMainInvokeEvent, WebContents } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DISCORD_OPERATIONS, DiscordOperation, MAX_DISCORD_GUILDS, parseDiscordRequest, projectDiscordSnapshot } from "../../src/dungeonJockey/contracts/discord";
import { createApplicationEntryPolicy } from "../../src/dungeonJockey/main/applicationEntryPolicy";
import { RendererRoleRegistry } from "../../src/dungeonJockey/main/RendererRoleRegistry";
import { createDiscordHandlers, DISCORD_IPC_TIMEOUT_MS } from "../../src/dungeonJockey/main/discordIpc";
import { DiscordConfigurationService } from "../../src/dungeonJockey/main/DiscordConfigurationService";
import { createDiscordSelection } from "../../src/dungeonJockey/adapters/secrets/discordSelection";
import { createSessionSecretStore } from "../../src/dungeonJockey/adapters/secrets/sessionSecretStore";
import { deferred, fakeDiscord, FAKE_DISCORD_SECRET } from "../fixtures/discord";

const operations = Object.keys(DISCORD_OPERATIONS) as DiscordOperation[];
const entry = "dungeon-jockey://app/index.html";
const id = "123e4567-e89b-42d3-a456-426614174000";
const frame = () => ({ parent: null as unknown, detached: false, url: entry });
function setup(role = "application") {
  const contents = { session: {}, mainFrame: frame(), getURL: () => entry, isDestroyed: () => false };
  const registry = new RendererRoleRegistry();
  registry.register(contents as unknown as WebContents, role, createApplicationEntryPolicy(entry, true));
  const { output } = fakeDiscord();
  const selection = createDiscordSelection("unused", "linux");
  const store = createSessionSecretStore();
  const configuration = new DiscordConfigurationService(selection, () => store, output, "session-only");
  const getServices = vi.fn(() => ({ configuration, output }));
  const handlers = createDiscordHandlers(registry, getServices);
  const event = () => ({ sender: contents, senderFrame: contents.mainFrame }) as unknown as IpcMainInvokeEvent;
  return { contents, registry, configuration, output, getServices, handlers, event, selection };
}
const request = (operation: DiscordOperation) => ({ id, protocolVersion: 1, type: DISCORD_OPERATIONS[operation],
  payload: operation === "configure" ? { secret: FAKE_DISCORD_SECRET } : ["join", "leave"].includes(operation) ? { guildId: "1", channelId: "11" } : {} });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(operations)("%s authorization", (operation) => {
  it.each(["program", "preview", "website", "player"])("denies role %s before parsing or dependency construction", async (role) => {
    const { handlers, getServices, event } = setup(role);
    const inspect = vi.fn(() => { throw new Error(FAKE_DISCORD_SECRET); });
    expect(await handlers.handler(operation)(event(), new Proxy({}, { getPrototypeOf: inspect, ownKeys: inspect }))).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    expect(inspect).not.toHaveBeenCalled(); expect(getServices).not.toHaveBeenCalled();
  });
  it.each(["contents", "session", "frame", "null", "subframe", "detached", "document", "url", "revoked", "disposed"])("denies %s before inspection", async (scenario) => {
    const { handlers, getServices, event, contents, registry } = setup();
    let sender = event();
    if (scenario === "contents") sender.sender = {} as WebContents;
    if (scenario === "session") contents.session = {};
    if (scenario === "frame") contents.mainFrame = frame();
    if (scenario === "null") sender = { ...sender, senderFrame: null };
    if (scenario === "subframe") contents.mainFrame.parent = {};
    if (scenario === "detached") contents.mainFrame.detached = true;
    if (scenario === "document") contents.mainFrame.url = "https://example.com";
    if (scenario === "url") contents.getURL = () => "https://example.com";
    if (scenario === "revoked") registry.revoke(contents as unknown as WebContents);
    if (scenario === "disposed") handlers.dispose();
    const inspect = vi.fn(() => { throw new Error(FAKE_DISCORD_SECRET); });
    expect(await handlers.handler(operation)(sender, new Proxy({}, { getPrototypeOf: inspect, ownKeys: inspect }))).toMatchObject({ id: null, error: { code: "IPC_FORBIDDEN" } });
    expect(inspect).not.toHaveBeenCalled(); expect(getServices).not.toHaveBeenCalled();
  });
  it("rejects malformed/oversized requests and redacts dependency exceptions", async () => {
    const { handlers, getServices, event } = setup();
    const handler = handlers.handler(operation);
    for (const value of [{ ...request(operation), id: FAKE_DISCORD_SECRET }, { ...request(operation), protocolVersion: 2 },
      { ...request(operation), payload: { secret: "x".repeat(20000) } }, { ...request(operation), extra: 1 }]) {
      expect(await handler(event(), value)).toMatchObject({ error: { code: "IPC_INVALID_REQUEST" } });
    }
    expect(getServices).not.toHaveBeenCalled();
    const logs = [vi.spyOn(console, "error"), vi.spyOn(console, "log"), vi.spyOn(console, "warn")];
    getServices.mockImplementationOnce(() => { throw new Error(FAKE_DISCORD_SECRET); });
    const result = await handler(event(), request(operation));
    expect(result).toMatchObject({ error: { code: "DISCORD_UNAVAILABLE" } });
    expect(JSON.stringify(result)).not.toContain(FAKE_DISCORD_SECRET);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
});
describe("Discord admission and projection", () => {
  it.each(["configure", "forget"] as const)("returns a fixed sanitized %s failure when the selected reference cannot be read", async (operation) => {
    const { handlers, configuration, selection, event } = setup();
    await configuration.configure(FAKE_DISCORD_SECRET);
    const selected = await selection.read();
    vi.spyOn(selection, "read").mockRejectedValueOnce(new Error(FAKE_DISCORD_SECRET));
    expect(await handlers.handler(operation)(event(), request(operation))).toEqual({
      ok: false, protocolVersion: 1, type: DISCORD_OPERATIONS[operation], id,
      error: { code: "DISCORD_UNAVAILABLE", message: "The Discord operation could not complete.", retryable: false },
    });
    expect(await selection.read()).toBe(selected);
    expect((await configuration.status()).state).toBe("configured");
    handlers.dispose(); configuration.dispose();
  });
  it("bounds outstanding provider work, settles replies on timeout, and releases only after underlying work ends", async () => {
    vi.useFakeTimers();
    const { handlers, configuration, event, getServices } = setup();
    const pending = deferred<{ state: "missing"; persistence: "session-only" }>();
    vi.spyOn(configuration, "status").mockReturnValue(pending.promise);
    const calls = Array.from({ length: 8 }, () => handlers.handler("configuration")(event(), request("configuration")));
    expect(await handlers.handler("configuration")(event(), request("configuration"))).toMatchObject({ error: { code: "IPC_BUSY" } });
    await vi.advanceTimersByTimeAsync(DISCORD_IPC_TIMEOUT_MS);
    for (const result of await Promise.all(calls)) expect(result).toMatchObject({ error: { code: "DISCORD_UNAVAILABLE" } });
    expect(getServices).toHaveBeenCalledTimes(8);
    expect(await handlers.handler("configuration")(event(), request("configuration"))).toMatchObject({ error: { code: "IPC_BUSY" } });
    pending.resolve({ state: "missing", persistence: "session-only" }); await vi.advanceTimersByTimeAsync(0);
    expect(await handlers.handler("status")(event(), request("status"))).toMatchObject({ ok: true, snapshot: { state: "disconnected" } });
    handlers.dispose();
  });
  it("disposal settles pending requests and revocation prevents a reply to a stale document", async () => {
    const { handlers, configuration, event, registry, contents } = setup();
    const pending = deferred<{ state: "missing"; persistence: "session-only" }>();
    vi.spyOn(configuration, "status").mockReturnValue(pending.promise);
    const response = handlers.handler("configuration")(event(), request("configuration"));
    registry.revoke(contents as unknown as WebContents);
    handlers.dispose();
    expect(await response).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    pending.resolve({ state: "missing", persistence: "session-only" });
  });
  it("uses exact bounded requests and projects only finite metadata", () => {
    for (const operation of operations) expect(parseDiscordRequest(request(operation), operation).id).toBe(id);
    const { output } = setup();
    const snapshot = output.snapshot();
    expect(projectDiscordSnapshot({ ...snapshot, secret: FAKE_DISCORD_SECRET } as never)).toEqual(snapshot);
    expect(() => projectDiscordSnapshot({ ...snapshot, guilds: Array(MAX_DISCORD_GUILDS + 1).fill({}) })).toThrow();
    expect(() => projectDiscordSnapshot({ ...snapshot, sequence: Infinity })).toThrow();
    expect(() => parseDiscordRequest({ ...request("join"), payload: { guildId: "../file", channelId: "1" } }, "join")).toThrow();
  });
});
