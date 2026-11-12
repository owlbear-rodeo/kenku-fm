import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseVersionRequest,
  VERSION_CHANNEL,
} from "../../src/dungeonJockey/contracts/version";

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { sendSync: vi.fn(() => "win32"), invoke: vi.fn(), on: vi.fn() },
}));
vi.mock("electron", () => electron);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("application preload", () => {
  it("exposes one async operation, owns request IDs and channels, and retains platform", async () => {
    vi.stubGlobal("process", { ...process, isMainFrame: true });
    const response = { ok: true, version: "1.5.5" };
    electron.ipcRenderer.invoke.mockResolvedValue(response);
    await import("../../src/preload");
    const exposed = new Map(
      electron.contextBridge.exposeInMainWorld.mock.calls.map(
        ([name, bridge]) => [name, bridge] as const,
      ),
    );
    const owned = exposed.get("dungeonJockey");
    expect(Object.keys(owned)).toEqual(["getVersion"]);
    expect(
      await owned.getVersion("attacker-channel", { id: "attacker-id" }),
    ).toBe(response);
    await owned.getVersion();
    const calls = electron.ipcRenderer.invoke.mock.calls;
    expect(calls).toHaveLength(2);
    for (const [channel, request] of calls) {
      expect(channel).toBe(VERSION_CHANNEL);
      expect(parseVersionRequest(request)).toEqual(request);
    }
    expect(calls[0][1].id).not.toBe(calls[1][1].id);
    expect(exposed.get("kenku").platform).toBe("win32");
    expect(exposed.get("kenku")).not.toHaveProperty("version");
    expect(electron.ipcRenderer.sendSync).toHaveBeenCalledExactlyOnceWith(
      "GET_PLATFORM",
    );
  });

  it("does not expose the owned namespace in a subframe", async () => {
    vi.stubGlobal("process", { ...process, isMainFrame: false });
    await import("../../src/preload");
    expect(
      electron.contextBridge.exposeInMainWorld.mock.calls.map(([name]) => name),
    ).toEqual(["kenku"]);
  });
});
