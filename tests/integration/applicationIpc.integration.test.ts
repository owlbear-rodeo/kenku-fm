import { EventEmitter } from "events";
import type { IpcMain, IpcMainInvokeEvent, WebContents } from "electron";
import { describe, expect, it, vi } from "vitest";
import {
  VERSION_CHANNEL,
  VERSION_OPERATION,
} from "../../src/dungeonJockey/contracts/version";
import { createApplicationEntryPolicy } from "../../src/dungeonJockey/main/applicationEntryPolicy";
import {
  createApplicationIpc,
  createVersionHandler,
} from "../../src/dungeonJockey/main/applicationIpc";
import { RendererRoleRegistry } from "../../src/dungeonJockey/main/RendererRoleRegistry";

const entry = "file:///C:/Dungeon%20Jockey/renderer/main_window/index.html";
const policy = createApplicationEntryPolicy(entry, true);
const id = "123e4567-e89b-42d3-a456-426614174000";
const request = () => ({
  id,
  type: VERSION_OPERATION,
  protocolVersion: 1,
  payload: {},
});
type TestFrame = { url: string; parent: TestFrame | null; detached: boolean };
const frame = (url = entry): TestFrame => ({
  url,
  parent: null,
  detached: false,
});

class Contents extends EventEmitter {
  session = {};
  mainFrame = frame();
  url = entry;
  destroyed = false;
  isDestroyed = () => this.destroyed;
  getURL = () => this.url;
  setWindowOpenHandler = vi.fn();
  asElectron(): WebContents {
    return this as unknown as WebContents;
  }
  event(senderFrame = this.mainFrame): IpcMainInvokeEvent {
    return {
      sender: this.asElectron(),
      senderFrame,
    } as unknown as IpcMainInvokeEvent;
  }
  start(url = entry) {
    this.emit("did-start-navigation", {
      isMainFrame: true,
      url,
      isSameDocument: false,
    });
  }
  commit(url = entry) {
    this.url = url;
    this.mainFrame = frame(url);
    this.emit("did-navigate", {}, url);
  }
}

function setup(role = "application") {
  const contents = new Contents();
  const registry = new RendererRoleRegistry();
  registry.register(contents.asElectron(), role, policy);
  const provider = vi.fn(() => "1.5.5");
  const handler = createVersionHandler(registry, provider);
  return { contents, registry, provider, handler };
}

describe("role-bound version IPC", () => {
  it("returns a typed serializable result for the registered application", () => {
    const { contents, handler, provider } = setup();
    const result = handler(contents.event(), request());
    expect(result).toEqual({
      ok: true,
      id,
      protocolVersion: 1,
      version: "1.5.5",
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(provider).toHaveBeenCalledOnce();
  });

  it.each(["program", "preview", "website", "player"])(
    "denies role %s",
    (role) => {
      const { contents, handler, provider } = setup(role);
      expect(handler(contents.event(), request())).toMatchObject({
        ok: false,
        error: { code: "IPC_FORBIDDEN" },
      });
      expect(provider).not.toHaveBeenCalled();
    },
  );

  it.each([
    "unregistered",
    "session",
    "subframe",
    "null frame",
    "stale frame",
    "detached",
    "frame document",
    "contents document",
    "revoked",
    "destroyed",
  ])("denies %s identity before inspecting request data", (scenario) => {
    const { contents, registry, handler, provider } = setup();
    let event = contents.event();
    switch (scenario) {
      case "unregistered":
        event = new Contents().event();
        break;
      case "session":
        contents.session = {};
        break;
      case "subframe":
        event = contents.event({ ...frame(), parent: contents.mainFrame });
        break;
      case "null frame":
        event = { ...event, senderFrame: null };
        break;
      case "stale frame":
        contents.mainFrame = frame();
        break;
      case "detached":
        contents.mainFrame.detached = true;
        break;
      case "frame document":
        contents.mainFrame.url = entry.replace("main_window", "player_window");
        break;
      case "contents document":
        contents.url = `${entry}.evil`;
        break;
      case "revoked":
        registry.revoke(contents.asElectron());
        break;
      case "destroyed":
        contents.destroyed = true;
        break;
    }
    const inspect = vi.fn(() => {
      throw new Error("must not inspect payload");
    });
    const hostile = new Proxy(
      {},
      { ownKeys: inspect, getPrototypeOf: inspect, get: inspect },
    );
    expect(handler(event, hostile)).toEqual({
      ok: false,
      protocolVersion: 1,
      id: null,
      error: {
        code: "IPC_FORBIDDEN",
        message: "This operation is not permitted.",
        retryable: false,
      },
    });
    expect(inspect).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("denies unavailable Electron frame properties without leaking the error", () => {
    const { contents, handler, provider } = setup();
    const event = contents.event();
    Object.defineProperty(event, "senderFrame", {
      get() {
        throw new Error("internal secret");
      },
    });
    expect(handler(event, request())).toMatchObject({
      error: { code: "IPC_FORBIDDEN" },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { ...request(), protocolVersion: 2 },
    { ...request(), id: "secret" },
    { ...request(), type: "other" },
    { ...request(), role: "application" },
    { ...request(), payload: [] },
    { ...request(), payload: null },
    { ...request(), payload: { extra: true } },
    { ...request(), payload: { nested: { secret: true } } },
    { ...request(), id: "x".repeat(10000) },
    { ...request(), payload: { [Symbol("extra")]: true } },
  ])(
    "rejects malformed envelopes and payloads without invoking provider (%#)",
    (value) => {
      const { contents, handler, provider } = setup();
      const result = handler(contents.event(), value);
      expect(result).toEqual({
        ok: false,
        protocolVersion: 1,
        id: null,
        error: {
          code: "IPC_INVALID_REQUEST",
          message: "The version request is invalid.",
          retryable: false,
        },
      });
      expect(provider).not.toHaveBeenCalled();
    },
  );

  it("bounds validation before traversal and rejects accessors, cycles and extra arguments", () => {
    const { contents, handler, provider } = setup();
    const getter = vi.fn(() => {
      throw new Error("secret");
    });
    const accessor = { ...request() };
    Object.defineProperty(accessor, "payload", { get: getter });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const value of [
      accessor,
      { ...request(), payload: cyclic },
      { ...request(), payload: new Date() },
    ]) {
      expect(handler(contents.event(), value)).toMatchObject({
        error: { code: "IPC_INVALID_REQUEST" },
      });
    }
    expect(handler(contents.event(), request(), "extra")).toMatchObject({
      error: { code: "IPC_INVALID_REQUEST" },
    });
    expect(handler(contents.event())).toMatchObject({
      error: { code: "IPC_INVALID_REQUEST" },
    });
    expect(getter).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("sanitizes unexpected provider failures and oversized responses", () => {
    const { contents, handler, provider } = setup();
    provider.mockImplementationOnce(() => {
      throw new Error("private-path secret internal-stack");
    });
    const expected = {
      ok: false,
      protocolVersion: 1,
      id,
      error: {
        code: "IPC_UNAVAILABLE",
        message: "The version is unavailable.",
        retryable: false,
      },
    };
    expect(handler(contents.event(), request())).toEqual(expected);
    provider.mockReturnValueOnce("x".repeat(129));
    expect(handler(contents.event(), request())).toEqual(expected);
  });
});

describe("application IPC lifetime and navigation", () => {
  function lifecycle(entryPolicy = policy) {
    const handlers = new Map<string, ReturnType<typeof createVersionHandler>>();
    const ipc = {
      handle: vi.fn(
        (channel: string, handler: ReturnType<typeof createVersionHandler>) => {
          if (handlers.has(channel)) throw new Error("Duplicate handler");
          handlers.set(channel, handler);
        },
      ),
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
    };
    const provider = vi.fn(() => "1.5.5");
    const owned = createApplicationIpc(ipc as unknown as IpcMain, provider);
    const contents = new Contents();
    const external = vi.fn();
    const unbind = owned.bindApplicationWindow(
      contents.asElectron(),
      entryPolicy,
      external,
    );
    const call = (event = contents.event()) =>
      handlers.get(VERSION_CHANNEL)(event, request());
    return { owned, contents, external, call, ipc, handlers, unbind, provider };
  }

  it("registers only committed documents and recovers after reload with one handler", () => {
    const { contents, call, ipc, owned } = lifecycle();
    expect(call()).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    contents.commit();
    expect(call()).toMatchObject({ ok: true });
    const stale = contents.event();
    contents.start();
    expect(call()).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    contents.commit();
    expect(call(stale)).toMatchObject({ error: { code: "IPC_FORBIDDEN" } });
    expect(call()).toMatchObject({ ok: true });
    expect(ipc.handle).toHaveBeenCalledTimes(1);
    owned.dispose();
  });

  it("registers the development entry and rejects another path on the same origin", () => {
    const developmentEntry = "http://localhost:3000/main_window";
    const { contents, call, owned } = lifecycle(
      createApplicationEntryPolicy(developmentEntry, false),
    );
    contents.commit(developmentEntry);
    expect(call()).toMatchObject({ ok: true, version: "1.5.5" });
    contents.start(developmentEntry);
    expect(call()).toMatchObject({ ok: false });
    contents.commit(developmentEntry);
    expect(call()).toMatchObject({ ok: true });
    contents.commit("http://localhost:3000/player_window");
    expect(call()).toMatchObject({ ok: false });
    owned.dispose();
  });

  it("does not restore a revoked role through history events during navigation or after a crash", () => {
    const { contents, call, owned } = lifecycle();
    contents.commit();
    contents.start("https://example.com");
    contents.emit("did-start-navigation", {
      isMainFrame: true,
      isSameDocument: true,
      url: `${entry}#settings`,
    });
    contents.emit("did-navigate-in-page", {}, `${entry}#settings`, true);
    expect(call()).toMatchObject({ ok: false });
    contents.commit();
    expect(call()).toMatchObject({ ok: true });
    contents.emit("render-process-gone");
    contents.emit("did-navigate-in-page", {}, entry, true);
    expect(call()).toMatchObject({ ok: false });
    owned.dispose();
  });

  it("denies navigation away, redirects and same-document path changes", () => {
    const { contents, call, owned, external } = lifecycle();
    contents.commit();
    contents.start("https://example.com");
    const navigation = { url: "https://example.com", preventDefault: vi.fn() };
    contents.emit("will-navigate", navigation);
    expect(navigation.preventDefault).toHaveBeenCalledOnce();
    expect(external).toHaveBeenCalledWith(navigation.url);
    expect(call()).toMatchObject({ ok: false });
    contents.commit();
    const redirect = {
      ...navigation,
      isMainFrame: true,
      preventDefault: vi.fn(),
    };
    contents.emit("will-redirect", redirect);
    expect(redirect.preventDefault).toHaveBeenCalledOnce();
    expect(call()).toMatchObject({ ok: false });
    contents.commit("file:///C:/other/index.html");
    expect(call()).toMatchObject({ ok: false });
    contents.commit();
    contents.url = contents.mainFrame.url = `${entry}?other`;
    contents.emit("did-navigate-in-page", {}, contents.url, true);
    expect(call()).toMatchObject({ ok: false });
    owned.dispose();
  });

  it("preserves owned navigation and ignores child-frame lifecycle events", () => {
    const { contents, call, owned } = lifecycle();
    contents.commit();
    const navigation = { url: entry, preventDefault: vi.fn() };
    contents.emit("will-navigate", navigation);
    expect(navigation.preventDefault).not.toHaveBeenCalled();
    contents.emit("did-start-navigation", {
      isMainFrame: false,
      url: "https://example.com",
    });
    expect(call()).toMatchObject({ ok: true });
    contents.emit("did-start-navigation", {
      isMainFrame: true,
      isSameDocument: true,
      url: `${entry}#settings`,
    });
    contents.url = contents.mainFrame.url = `${entry}#settings`;
    contents.emit("did-navigate-in-page", {}, contents.url, true);
    expect(call()).toMatchObject({ ok: true });
    owned.dispose();
  });

  it("keeps popups out of the application and delegates only ordinary external links", () => {
    const { contents, external, owned } = lifecycle();
    const open = contents.setWindowOpenHandler.mock.calls[0][0];
    expect(open({ url: "https://example.com" })).toEqual({ action: "deny" });
    expect(external).toHaveBeenCalledOnce();
    expect(open({ url: "file:///C:/other.html" })).toEqual({ action: "deny" });
    expect(external).toHaveBeenCalledOnce();
    owned.dispose();
  });

  it("revokes on crash/destruction and permits a new window without duplicate handlers", () => {
    const { contents, call, owned, ipc, external } = lifecycle();
    contents.commit();
    contents.emit("render-process-gone");
    expect(call()).toMatchObject({ ok: false });
    contents.commit();
    expect(call()).toMatchObject({ ok: true });
    contents.destroyed = true;
    contents.emit("destroyed");
    expect(call()).toMatchObject({ ok: false });
    expect(contents.eventNames()).toEqual([]);
    const replacement = new Contents();
    owned.bindApplicationWindow(replacement.asElectron(), policy, external);
    replacement.commit();
    expect(call(replacement.event())).toMatchObject({ ok: true });
    expect(ipc.handle).toHaveBeenCalledTimes(1);
    owned.dispose();
    expect(replacement.eventNames()).toEqual([]);
  });

  it("rebinds without stale listeners and explicitly disposes registrations and handler", () => {
    const { contents, call, owned, ipc, external, handlers, unbind } =
      lifecycle();
    contents.commit();
    owned.bindApplicationWindow(contents.asElectron(), policy, external);
    unbind(); // An old cleanup cannot revoke the replacement binding.
    contents.commit();
    expect(call()).toMatchObject({ ok: true });
    expect(contents.listenerCount("did-navigate")).toBe(1);
    const retainedHandler = handlers.get(VERSION_CHANNEL);
    owned.dispose();
    owned.dispose();
    expect(ipc.removeHandler).toHaveBeenCalledExactlyOnceWith(VERSION_CHANNEL);
    expect(contents.eventNames()).toEqual([]);
    expect(retainedHandler(contents.event(), request())).toMatchObject({
      ok: false,
    });
    expect(() =>
      owned.bindApplicationWindow(contents.asElectron(), policy, external),
    ).toThrow();
  });
});
