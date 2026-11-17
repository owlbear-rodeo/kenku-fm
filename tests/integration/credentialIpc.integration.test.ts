import { EventEmitter } from "events";
import type { IpcMain, IpcMainInvokeEvent, WebContents } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CREDENTIAL_CHANNELS, CREDENTIAL_OPERATIONS, CredentialOperation, parseCredentialResult } from "../../src/dungeonJockey/contracts/credentials";
import { VERSION_CHANNEL, VERSION_OPERATION } from "../../src/dungeonJockey/contracts/version";
import { parseCredentialId } from "../../src/dungeonJockey/domain/ids/CredentialId";
import { createApplicationEntryPolicy } from "../../src/dungeonJockey/main/applicationEntryPolicy";
import { createApplicationIpc } from "../../src/dungeonJockey/main/applicationIpc";
import { createCredentialHandlers, MAX_OUTSTANDING_CREDENTIAL_OPERATIONS } from "../../src/dungeonJockey/main/credentialIpc";
import { RendererRoleRegistry } from "../../src/dungeonJockey/main/RendererRoleRegistry";
import { createSessionSecretStore } from "../../src/dungeonJockey/adapters/secrets/sessionSecretStore";

const entry = "dungeon-jockey://app/index.html";
const policy = createApplicationEntryPolicy(entry, true);
const id = "123e4567-e89b-42d3-a456-426614174000";
const credentialId = parseCredentialId("00000000-0000-4000-8000-000000000001");
const FAKE = "fake-credential-ipc-secret";
const CIPHERTEXT = "fake-credential-ipc-ciphertext";
const operations = Object.keys(CREDENTIAL_CHANNELS) as CredentialOperation[];
const request = (operation: CredentialOperation) => ({ id, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation],
  payload: operation === "store" ? { secret: FAKE } : operation === "replace" ? { credentialId, secret: FAKE } : { credentialId } });
type Frame = { parent: Frame | null; detached: boolean; url: string };
const frame = (): Frame => ({ parent: null, detached: false, url: entry });
class Contents extends EventEmitter {
  session = {};
  mainFrame = frame();
  url = entry;
  destroyed = false;
  isDestroyed = () => this.destroyed;
  getURL = () => this.url;
  setWindowOpenHandler = vi.fn();
  asElectron() { return this as unknown as WebContents; }
  event(senderFrame = this.mainFrame) { return { sender: this.asElectron(), senderFrame } as unknown as IpcMainInvokeEvent; }
  commit() { this.mainFrame = frame(); this.url = entry; this.emit("did-navigate"); }
}
function setup(role = "application") {
  const contents = new Contents();
  const registry = new RendererRoleRegistry();
  registry.register(contents.asElectron(), role, policy);
  const store = {
    store: vi.fn(async () => ({ ok: true as const, id: credentialId, persistence: "remembered" as const })),
    status: vi.fn(async () => ({ state: "available" as const, persistence: "remembered" as const })),
    replace: vi.fn(async () => ({ ok: true as const, persistence: "remembered" as const })),
    forget: vi.fn(async () => ({ ok: true as const, persistence: "remembered" as const })),
  };
  const getStore = vi.fn(() => store);
  const handlers = createCredentialHandlers(registry, getStore);
  return { contents, registry, store, getStore, handlers };
}
afterEach(() => vi.restoreAllMocks());

describe.each(operations)("%s sender and redaction boundary", (operation) => {
  it.each(["program", "preview", "website", "player"])("denies %s before parsing or constructing storage", async (role) => {
    const { handlers, contents, getStore } = setup(role);
    const inspect = vi.fn(() => { throw new Error(FAKE); });
    const hostile = new Proxy({}, { getPrototypeOf: inspect, ownKeys: inspect, get: inspect });
    const result = await handlers.handler(operation)(contents.event(), hostile);
    expect(result).toMatchObject({ ok: false, id: null, error: { code: "IPC_FORBIDDEN" } });
    expect(inspect).not.toHaveBeenCalled();
    expect(getStore).not.toHaveBeenCalled();
  });

  it.each(["unregistered", "session", "subframe", "null", "stale", "detached", "frame document", "contents document", "revoked", "destroyed", "frame throws"])(
    "denies %s identity before touching the request", async (scenario) => {
      const { handlers, contents, registry, getStore } = setup();
      let event = contents.event();
      if (scenario === "unregistered") event = new Contents().event();
      if (scenario === "session") contents.session = {};
      if (scenario === "subframe") event = contents.event({ ...frame(), parent: contents.mainFrame });
      if (scenario === "null") event = { ...event, senderFrame: null };
      if (scenario === "stale") contents.mainFrame = frame();
      if (scenario === "detached") contents.mainFrame.detached = true;
      if (scenario === "frame document") contents.mainFrame.url = entry.replace("index", "player");
      if (scenario === "contents document") contents.url = `${entry}?other`;
      if (scenario === "revoked") registry.revoke(contents.asElectron());
      if (scenario === "destroyed") contents.destroyed = true;
      if (scenario === "frame throws") Object.defineProperty(event, "senderFrame", { get() { throw new Error(FAKE); } });
      const inspect = vi.fn(() => { throw new Error(FAKE); });
      const hostile = new Proxy({}, { ownKeys: inspect, getPrototypeOf: inspect, get: inspect });
      expect(await handlers.handler(operation)(event, hostile)).toEqual({
        ok: false, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id: null,
        error: { code: "IPC_FORBIDDEN", message: "This operation is not permitted.", retryable: false },
      });
      expect(inspect).not.toHaveBeenCalled();
      expect(getStore).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid payloads/argument counts without reflecting IDs or calling the factory", async () => {
    const { handlers, contents, getStore } = setup();
    const handler = handlers.handler(operation);
    for (const args of [[], [request(operation), "extra"], [{ ...request(operation), payload: { secret: {} } }], [{ ...request(operation), id: FAKE }]]) {
      expect(await handler(contents.event(), ...args)).toMatchObject({ ok: false, id: null, error: { code: "IPC_INVALID_REQUEST" } });
    }
    expect(getStore).not.toHaveBeenCalled();
  });

  it("projects allowlisted fields, sanitizes exceptions and never emits payloads or logs", async () => {
    const { handlers, contents, store, getStore } = setup();
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info"), vi.spyOn(console, "debug")];
    const emit = vi.spyOn(contents, "emit");
    const handler = handlers.handler(operation);
    const clean = await handler(contents.event(), request(operation));
    expect(parseCredentialResult(clean, operation)).toEqual(clean);
    expect(clean).toEqual({ ok: true, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id, credentialId,
      ...(operation === "status" ? { status: { state: "available", persistence: "remembered" } } : { persistence: "remembered" }) });
    const dependencyResult = operation === "status" ? { state: "available", persistence: "remembered" }
      : { ok: true, id: credentialId, persistence: "remembered" };
    const method = store[operation];
    method.mockResolvedValueOnce({ ...dependencyResult, plaintext: FAKE, ciphertext: CIPHERTEXT,
      toJSON() { throw new Error(FAKE); } } as never);
    expect(await handler(contents.event(), request(operation))).toEqual(clean);
    const failure = { ok: false, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id,
      error: { code: "SECRET_UNAVAILABLE", message: "The credential operation is unavailable.", retryable: false } };
    method.mockRejectedValueOnce(new Error(`${FAKE} ${CIPHERTEXT}`));
    expect(await handler(contents.event(), request(operation))).toEqual(failure);
    getStore.mockImplementationOnce(() => { throw new Error(FAKE); });
    expect(await handler(contents.event(), request(operation))).toEqual(failure);
    method.mockResolvedValueOnce({ ...dependencyResult, persistence: FAKE } as never);
    expect(await handler(contents.event(), request(operation))).toEqual(failure);
    method.mockResolvedValueOnce({ ...dependencyResult, ...(operation === "status" ? { state: { secret: FAKE } } : { ok: FAKE }) } as never);
    expect(await handler(contents.event(), request(operation))).toEqual(failure);
    if (operation !== "status") {
      method.mockResolvedValueOnce({ ok: false, code: FAKE, cause: CIPHERTEXT } as never);
      expect(await handler(contents.event(), request(operation))).toEqual(failure);
    }
    if (operation === "store") {
      for (const id of [FAKE, "x".repeat(100000), { secret: FAKE }]) {
        method.mockResolvedValueOnce({ ...dependencyResult, id } as never);
        expect(await handler(contents.event(), request(operation))).toEqual(failure);
      }
    }
    for (const spy of [...logs, emit]) expect(spy).not.toHaveBeenCalled();
  });
});

describe("credential admission and application lifetime", () => {
  it("admits at most eight mixed operations, releases all outcomes and leaves version responsive", async () => {
    const { contents, store, getStore } = setup();
    const registered = new Map<string, (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown>();
    const ipc = { handle: (channel: string, handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => registered.set(channel, handler),
      removeHandler: (channel: string) => registered.delete(channel) };
    const app = createApplicationIpc(ipc as unknown as IpcMain, () => "1.5.5", getStore);
    app.bindApplicationWindow(contents.asElectron(), policy, vi.fn());
    contents.commit();
    let release: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    for (const operation of operations) {
      const value = await store[operation]();
      store[operation].mockImplementation(async () => { await pending; return value as never; });
    }
    const calls = Array.from({ length: MAX_OUTSTANDING_CREDENTIAL_OPERATIONS }, (_, index) => {
      const operation = operations[index % operations.length];
      return registered.get(CREDENTIAL_CHANNELS[operation])(contents.event(), request(operation));
    });
    expect(getStore).toHaveBeenCalledTimes(8);
    for (const operation of operations) {
      expect(await registered.get(CREDENTIAL_CHANNELS[operation])(contents.event(), request(operation))).toMatchObject({ id, error: { code: "IPC_BUSY", retryable: true } });
    }
    expect(getStore).toHaveBeenCalledTimes(8);
    expect(registered.get(VERSION_CHANNEL)(contents.event(), { id, protocolVersion: 1, type: VERSION_OPERATION, payload: {} })).toMatchObject({ ok: true, version: "1.5.5" });
    release();
    for (const result of await Promise.all(calls)) expect(result).toMatchObject({ ok: true });
    for (let index = 0; index < 10; index++) {
      store.store.mockRejectedValueOnce(new Error(FAKE));
      expect(await registered.get(CREDENTIAL_CHANNELS.store)(contents.event(), request("store"))).toMatchObject({ error: { code: "SECRET_UNAVAILABLE" } });
    }
    expect(await registered.get(CREDENTIAL_CHANNELS.store)(contents.event(), request("store"))).toMatchObject({ ok: true });
    app.dispose();
  });

  it.each(operations)("revokes %s through navigation, crash, rebind, destruction and disposal", async (operation) => {
    const { contents, getStore, store } = setup();
    const registered = new Map<string, ReturnType<ReturnType<typeof createCredentialHandlers>["handler"]>>();
    const ipc = { handle: vi.fn((channel: string, handler: ReturnType<ReturnType<typeof createCredentialHandlers>["handler"]>) => registered.set(channel, handler)),
      removeHandler: vi.fn((channel: string) => registered.delete(channel)) };
    const app = createApplicationIpc(ipc as unknown as IpcMain, () => "1.5.5", getStore);
    const unbind = app.bindApplicationWindow(contents.asElectron(), policy, vi.fn());
    const handler = registered.get(CREDENTIAL_CHANNELS[operation]);
    const call = (event = contents.event()) => handler(event, request(operation));
    const denied = async () => {
      const before = getStore.mock.calls.length;
      expect(await call()).toMatchObject({ id: null, error: { code: "IPC_FORBIDDEN" } });
      expect(getStore).toHaveBeenCalledTimes(before);
    };
    await denied();
    contents.commit();
    expect(await call()).toMatchObject({ ok: true });
    const stale = contents.event();
    for (const event of ["did-start-navigation", "render-process-gone", "will-navigate", "will-redirect", "did-navigate-in-page"]) {
      if (event === "did-navigate-in-page") contents.emit(event, {}, "https://example.com", true);
      else contents.emit(event, { isMainFrame: true, isSameDocument: false, url: "https://example.com", preventDefault: vi.fn() });
      contents.emit("did-navigate-in-page", {}, `${entry}#settings`, true);
      await denied();
      contents.commit();
      expect(await call()).toMatchObject({ ok: true });
    }
    expect(await call(stale)).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    app.bindApplicationWindow(contents.asElectron(), policy, vi.fn());
    unbind();
    await denied();
    contents.commit();
    expect(contents.listenerCount("did-navigate")).toBe(1);
    expect(await call()).toMatchObject({ ok: true });
    contents.emit("destroyed");
    await denied();
    app.bindApplicationWindow(contents.asElectron(), policy, vi.fn());
    contents.commit();
    let finish: (value: never) => void;
    store[operation].mockImplementationOnce(() => new Promise<never>((resolve) => { finish = resolve; }));
    const accepted = call();
    app.dispose();
    app.dispose();
    await denied();
    expect(registered.size).toBe(0);
    expect(ipc.handle).toHaveBeenCalledTimes(5);
    expect(ipc.removeHandler).toHaveBeenCalledTimes(5);
    expect(contents.eventNames()).toEqual([]);
    finish((operation === "status" ? { state: "available", persistence: "remembered" } : { ok: true, id: credentialId, persistence: "remembered" }) as never);
    expect(await accepted).toMatchObject({ ok: true });
  });

  it("preserves session credentials across rebind, exposes missing and resets only with a new store", async () => {
    const { contents, registry } = setup();
    const store = createSessionSecretStore();
    const handlers = createCredentialHandlers(registry, () => store);
    const saved = await handlers.handler("store")(contents.event(), request("store"));
    if (!saved.ok) throw new Error("Fake credential save failed");
    const call = (operation: "status" | "replace" | "forget") => handlers.handler(operation)(contents.event(), {
      ...request(operation), payload: { ...request(operation).payload, credentialId: saved.credentialId },
    });
    registry.revoke(contents.asElectron());
    contents.commit();
    registry.register(contents.asElectron(), "application", policy);
    expect(await call("status")).toMatchObject({ status: { state: "available", persistence: "session-only" } });
    expect(await call("replace")).toMatchObject({ ok: true, persistence: "session-only" });
    expect(await createSessionSecretStore().status(saved.credentialId)).toMatchObject({ state: "missing" });
    expect(await call("forget")).toMatchObject({ ok: true });
    expect(await call("status")).toMatchObject({ status: { state: "missing", persistence: "session-only" } });
    expect(await call("replace")).toMatchObject({ error: { code: "CREDENTIAL_MISSING" } });
  });
});
