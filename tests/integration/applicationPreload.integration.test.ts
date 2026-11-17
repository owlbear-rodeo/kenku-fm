import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseVersionRequest,
  VERSION_CHANNEL,
} from "../../src/dungeonJockey/contracts/version";
import { CREDENTIAL_CHANNELS, CREDENTIAL_OPERATIONS, CredentialOperation, parseCredentialRequest } from "../../src/dungeonJockey/contracts/credentials";

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
  it("exposes only named operations, owns request IDs and channels, and retains platform", async () => {
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
    expect(Object.keys(owned)).toEqual(["getVersion", "storeCredential", "getCredentialStatus", "replaceCredential", "forgetCredential"]);
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
    const credentialId = "00000000-0000-4000-8000-000000000001";
    const secret = "fake-preload-credential";
    await owned.storeCredential(secret, "attacker-channel");
    await owned.getCredentialStatus(credentialId, "attacker-channel");
    await owned.replaceCredential(credentialId, secret, "attacker-channel");
    await owned.forgetCredential(credentialId, "attacker-channel");
    const operations = Object.keys(CREDENTIAL_CHANNELS) as CredentialOperation[];
    for (const [index, operation] of operations.entries()) {
      const [channel, request] = calls[index + 2];
      expect(channel).toBe(CREDENTIAL_CHANNELS[operation]);
      expect(parseCredentialRequest(request, operation)).toEqual({
        id: request.id, type: CREDENTIAL_OPERATIONS[operation], protocolVersion: 1,
        payload: operation === "store" ? { secret } : operation === "replace" ? { credentialId, secret } : { credentialId },
      });
    }
    expect(new Set(calls.map(([, request]) => request.id)).size).toBe(6);
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
