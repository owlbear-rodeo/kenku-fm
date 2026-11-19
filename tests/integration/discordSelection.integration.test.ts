import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiscordSelection } from "../../src/dungeonJockey/adapters/secrets/discordSelection";
import { parseCredentialId } from "../../src/dungeonJockey/domain/ids/CredentialId";

const first = parseCredentialId("00000000-0000-4000-8000-000000000001");
const second = parseCredentialId("00000000-0000-4000-8000-000000000002");
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), "discord-selection-")); });
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
describe("fixed Discord selection publication", () => {
  it.each(["mkdir", "open", "write", "sync", "rename"])("preserves the previous ID after failed %s", async (step) => {
    const selection = createDiscordSelection(root, "win32"); await selection.write(first);
    const failure = new Error("fake-sensitive-native-exception");
    if (step === "mkdir") vi.spyOn(fs, "mkdir").mockRejectedValueOnce(failure);
    if (step === "open") vi.spyOn(fs, "open").mockRejectedValueOnce(failure);
    if (step === "rename") vi.spyOn(fs, "rename").mockRejectedValueOnce(failure);
    if (step === "write" || step === "sync") {
      const open = fs.open;
      vi.spyOn(fs, "open").mockImplementationOnce(async (...args) => {
        const handle = await open(...args);
        if (step === "write") vi.spyOn(handle, "writeFile").mockRejectedValueOnce(failure);
        else vi.spyOn(handle, "sync").mockRejectedValueOnce(failure);
        return handle;
      });
    }
    await expect(selection.write(second)).rejects.toThrow("Discord configuration unavailable");
    expect(await createDiscordSelection(root, "win32").read()).toBe(first);
    expect(await fs.readdir(root)).toEqual(["discord-configuration.json"]);
  });
  it("distinguishes absent from unreadable or oversized configuration and never overwrites on read", async () => {
    const selection = createDiscordSelection(root, "darwin"); expect(await selection.read()).toBeNull();
    const file = path.join(root, "discord-configuration.json");
    for (const value of ["malformed", JSON.stringify({ version: 2, credentialId: first }), "x".repeat(257)]) {
      await fs.writeFile(file, value);
      await expect(selection.read()).rejects.toThrow("Discord configuration unavailable");
      expect(await fs.readFile(file, "utf8")).toBe(value);
    }
  });
});
