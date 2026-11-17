import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VERSION_CHANNEL,
  VERSION_OPERATION,
} from "../../src/dungeonJockey/contracts/version";
import { CREDENTIAL_CHANNELS, CREDENTIAL_OPERATIONS, CredentialResult } from "../../src/dungeonJockey/contracts/credentials";
import { createSessionSecretStore } from "../../src/dungeonJockey/adapters/secrets/sessionSecretStore";

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

const state = vi.hoisted(() => ({
  windows: [] as BrowserWindow[],
  handlers: new Map<string, IpcHandler>(),
  legacyConstruct: vi.fn(),
  legacyDestroy: vi.fn(),
  rootConstruct: vi.fn(),
  rootRefresh: vi.fn(),
  rootDispose: vi.fn(),
  order: [] as string[],
  protocolHandle: vi.fn(),
  registerSchemes: vi.fn(),
  getStore: vi.fn(),
}));
vi.mock("../../src/dungeonJockey/main/secretStore", () => ({ getApplicationSecretStore: state.getStore }));

vi.mock("electron", async () => {
  const { EventEmitter } = await import("events");
  const defaultSession = {
    webRequest: { onBeforeSendHeaders: vi.fn() },
    protocol: { handle: state.protocolHandle },
  };
  class WindowMock extends EventEmitter {
    webContents = Object.assign(new EventEmitter(), {
      session: defaultSession,
      mainFrame: { parent: null as unknown, detached: false, url: "" },
      isDestroyed: () => false,
      getURL: () => this.webContents.mainFrame.url,
      setWindowOpenHandler: vi.fn(),
      setUserAgent: vi.fn(),
    });
    constructor(readonly options: unknown) {
      super();
      state.order.push("window");
      state.windows.push(this as unknown as BrowserWindow);
    }
    loadURL(url: string) {
      state.order.push("load");
      this.webContents.emit("did-start-navigation", {
        isMainFrame: true,
        isSameDocument: false,
      });
      this.webContents.emit("did-start-loading");
      this.webContents.mainFrame = { parent: null, detached: false, url };
      this.webContents.emit("did-navigate", {}, url);
    }
    static getAllWindows() {
      return state.windows;
    }
  }
  return {
    app: Object.assign(new EventEmitter(), {
      isPackaged: false,
      requestSingleInstanceLock: () => true,
      whenReady: () => {
        state.order.push("ready");
        return Promise.resolve();
      },
      getAppPath: () => path.resolve("test-package"),
      getVersion: () => "1.5.5",
      quit: vi.fn(),
    }),
    BrowserWindow: WindowMock,
    components: {
      whenReady: () => {
        state.order.push("components");
        return Promise.resolve();
      },
      status: () => ({}),
    },
    session: { defaultSession },
    protocol: { registerSchemesAsPrivileged: state.registerSchemes },
    shell: { openExternal: vi.fn() },
    powerSaveBlocker: { start: () => 1, stop: vi.fn() },
    ipcMain: {
      on: vi.fn(),
      handle: (
        channel: string,
        handler: IpcHandler,
      ) => {
        if (state.handlers.has(channel)) throw new Error("duplicate handler");
        state.handlers.set(channel, handler);
      },
      removeHandler: (channel: string) => state.handlers.delete(channel),
    },
  };
});
vi.mock("../../src/applicationProfile", () => ({
  configureApplicationProfile: () => ({
    mode: "test",
    userDataPath: path.resolve("test-profile"),
  }),
}));
vi.mock("../../src/menu", () => ({ configureApplicationMenu: vi.fn() }));
vi.mock("../../src/bounds", () => ({
  getSavedBounds: () => ({ bounds: {}, maximized: false }),
  saveWindowBounds: vi.fn(),
}));
vi.mock("../../src/main/userAgent", () => ({
  getUserAgent: () => "test",
  getMalformedUserAgent: () => "test",
}));
vi.mock("../../src/main/managers/SessionManager", () => ({
  SessionManager: class {
    constructor() {
      state.legacyConstruct();
    }
    destroy() {
      state.legacyDestroy();
    }
  },
}));
vi.mock("../../src/dungeonJockey/main/compositionRoot", () => ({
  createDungeonJockeyCompositionRoot: () => {
    state.rootConstruct();
    return {
      refreshVisibleRendererCompatibilitySession: state.rootRefresh,
      dispose: state.rootDispose,
    };
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  state.windows.length = 0;
  state.handlers.clear();
  state.order.length = 0;
  state.registerSchemes.mockImplementation(() => state.order.push("scheme"));
  state.protocolHandle.mockImplementation(() => state.order.push("handler"));
  const store = createSessionSecretStore();
  state.getStore.mockReturnValue(store);
  vi.stubGlobal(
    "MAIN_WINDOW_WEBPACK_ENTRY",
    "http://localhost:3000/main_window",
  );
  vi.stubGlobal("MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY", "application-preload.js");
});

afterEach(async () => {
  const { app } = await import("electron");
  app.emit("will-quit");
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("application startup IPC wiring", () => {
  it.each([
    ["dungeon-jockey", false],
    ["legacy-kenku", false],
    ["dungeon-jockey", true],
  ] as const)(
    "guards version in %s windows (packaged=%s) across reload",
    async (route, packaged) => {
      const electron = await import("electron");
      Object.defineProperty(electron.app, "isPackaged", { value: packaged, configurable: true });
      vi.stubEnv("DUNGEON_JOCKEY_STARTUP_ROUTE", route);
      await import("../../src/index");
      await vi.waitFor(() => expect(state.windows).toHaveLength(1));
      const window = state.windows[0];
      const entry = packaged ? "dungeon-jockey://app/index.html" : "http://localhost:3000/main_window";
      expect(window.webContents.getURL()).toBe(entry);
      expect(state.order).toEqual(packaged
        ? ["scheme", "ready", "components", "handler", "window", "load"]
        : ["scheme", "ready", "components", "window", "load"]);
      const { session } = await import("electron");
      expect(window.webContents.session).toBe(session.defaultSession);
      expect(state.protocolHandle).toHaveBeenCalledTimes(packaged ? 1 : 0);
      if (packaged) {
        expect(state.protocolHandle).toHaveBeenCalledWith("dungeon-jockey", expect.any(Function));
      }
      expect(
        (window as unknown as { options: { webPreferences: unknown } }).options
          .webPreferences,
      ).toEqual({
        preload: "application-preload.js",
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      });
      const handler = state.handlers.get(VERSION_CHANNEL);
      const read = () =>
        handler(
          {
            sender: window.webContents,
            senderFrame: window.webContents.mainFrame,
          } as IpcMainInvokeEvent,
          {
            id: "123e4567-e89b-42d3-a456-426614174000",
            type: VERSION_OPERATION,
            protocolVersion: 1,
            payload: {},
          },
        );
      expect(read()).toMatchObject({ ok: true, version: "1.5.5" });
      expect(state.getStore).not.toHaveBeenCalled();
      const credentialHandler = state.handlers.get(CREDENTIAL_CHANNELS.store);
      const saved = await credentialHandler({ sender: window.webContents, senderFrame: window.webContents.mainFrame } as IpcMainInvokeEvent,
        { id: "123e4567-e89b-42d3-a456-426614174000", type: CREDENTIAL_OPERATIONS.store, protocolVersion: 1, payload: { secret: "fake-startup-credential" } }) as CredentialResult<"store">;
      expect(state.getStore).toHaveBeenCalledExactlyOnceWith(path.resolve("test-profile"));
      if (!saved.ok) throw new Error("Fake credential save failed");
      window.loadURL(entry);
      expect(state.handlers.get(VERSION_CHANNEL)).toBe(handler);
      expect(read()).toMatchObject({ ok: true, version: "1.5.5" });
      expect(state.handlers.get(CREDENTIAL_CHANNELS.store)).toBe(credentialHandler);
      expect(await state.handlers.get(CREDENTIAL_CHANNELS.status)({ sender: window.webContents, senderFrame: window.webContents.mainFrame } as IpcMainInvokeEvent,
        { id: "123e4567-e89b-42d3-a456-426614174000", type: CREDENTIAL_OPERATIONS.status, protocolVersion: 1, payload: { credentialId: saved.credentialId } })).toMatchObject({
          ok: true, credentialId: saved.credentialId, status: { state: "available", persistence: "session-only" },
        });
      expect(state.getStore).toHaveBeenCalledTimes(2);
      if (route === "legacy-kenku") {
        expect(state.rootConstruct).not.toHaveBeenCalled();
        expect(state.legacyDestroy).toHaveBeenCalledTimes(2);
      } else {
        expect(state.rootConstruct).toHaveBeenCalledOnce();
        expect(state.rootRefresh).toHaveBeenCalledTimes(2);
      }
      window.webContents.emit("destroyed");
      expect(read()).toMatchObject({
        ok: false,
        error: { code: "IPC_FORBIDDEN" },
      });
      const { app } = await import("electron");
      app.emit("will-quit");
      expect(state.handlers.has(VERSION_CHANNEL)).toBe(false);
      for (const channel of Object.values(CREDENTIAL_CHANNELS)) expect(state.handlers.has(channel)).toBe(false);
    },
  );
});
