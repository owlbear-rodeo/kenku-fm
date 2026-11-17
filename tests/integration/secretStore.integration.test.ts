import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialId, parseCredentialId } from "../../src/dungeonJockey/domain/ids/CredentialId";
import { createProtectedSecretStore } from "../../src/dungeonJockey/adapters/secrets/protectedSecretStore";
import { createSessionSecretStore } from "../../src/dungeonJockey/adapters/secrets/sessionSecretStore";
import { SecretStorePort } from "../../src/dungeonJockey/ports/SecretStorePort";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import { RendererRoleRegistry } from "../../src/dungeonJockey/main/RendererRoleRegistry";
import { createApplicationEntryPolicy } from "../../src/dungeonJockey/main/applicationEntryPolicy";
import { createCredentialHandlers } from "../../src/dungeonJockey/main/credentialIpc";
import { CREDENTIAL_OPERATIONS, CredentialOperation, parseCredentialResult } from "../../src/dungeonJockey/contracts/credentials";

const FAKE = "fake-credential-for-storage-tests";
const REPLACEMENT = "fake-replacement-for-storage-tests";
const SENTINEL = "fake-sensitive-error-sentinel";
const ABSENT = parseCredentialId("00000000-0000-4000-8000-000000000001");
let root: string;
let directory: string;
let protection: ReturnType<typeof fakeProtection>;
let store: SecretStorePort;

// Real ciphertext makes at-rest assertions meaningful; this is not a substitute
// for the separate native Electron probe. The key is never written to disk.
function fakeProtection() {
  const key = randomBytes(32);
  return {
    isAsyncEncryptionAvailable: vi.fn(async () => true),
    encryptStringAsync: vi.fn(async (value: string) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), bytes]);
    }),
    decryptStringAsync: vi.fn(async (bytes: Buffer) => {
      const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return {
        result: Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"),
        shouldReEncrypt: false,
      };
    }),
  };
}

function filename(id: CredentialId) {
  return path.join(directory, `${createHash("sha256").update(id).digest("hex")}.json`);
}
async function save(target = store) {
  const result = await target.store(FAKE);
  if (!result.ok) throw new Error("Test credential could not be stored");
  return result.id;
}
async function expectUse(target: SecretStorePort, id: CredentialId, value: string) {
  const consumer = vi.fn(async (secret: string) => { expect(secret).toBe(value); });
  expect(await target.use(id, consumer)).toMatchObject({ ok: true });
  expect(consumer).toHaveBeenCalledOnce();
}
function deferred() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve: () => resolve() };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "secret-store-contract-"));
  directory = path.join(root, "Protected Credentials");
  protection = fakeProtection();
  store = createProtectedSecretStore(root, protection);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

describe.each(["remembered", "session-only"] as const)("%s secret contract", (persistence) => {
  function target() { return persistence === "remembered" ? store : createSessionSecretStore(); }

  it("creates opaque IDs, reports status, replaces, uses and explicitly forgets", async () => {
    const current = target();
    expect(await current.status(ABSENT)).toEqual({ state: "missing", persistence });
    expect(await current.replace(ABSENT, FAKE)).toEqual({ ok: false, code: "CREDENTIAL_MISSING" });
    const id = await save(current);
    expect(parseCredentialId(id)).toBe(id);
    expect(await current.status(id)).toEqual({ state: "available", persistence });
    await expectUse(current, id, FAKE);
    expect(await current.replace(id, REPLACEMENT)).toEqual({ ok: true, persistence });
    await expectUse(current, id, REPLACEMENT);
    expect(await current.forget(id)).toEqual({ ok: true, persistence });
    expect(await current.status(id)).toEqual({ state: "missing", persistence });
    const consumer = vi.fn();
    expect(await current.use(id, consumer)).toEqual({ ok: false, code: "CREDENTIAL_MISSING" });
    expect(consumer).not.toHaveBeenCalled();
    expect(await current.forget(id)).toEqual({ ok: true, persistence });
  });

  it.each(["../escape", "C:\\outside", "not-an-id", "00000000-0000-4000-8000-00000000000A", null, {}])(
    "rejects invalid IDs before accessing storage", async (invalid) => {
      const current = target();
      const id = invalid as CredentialId;
      const read = vi.spyOn(fs, "lstat");
      const consumer = vi.fn();
      expect(await current.status(id)).toEqual({ state: "unavailable", persistence, code: "INVALID_CREDENTIAL_ID" });
      for (const result of [await current.replace(id, FAKE), await current.forget(id), await current.use(id, consumer)]) {
        expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIAL_ID" });
      }
      expect(read).not.toHaveBeenCalled();
      expect(consumer).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid secrets, discards consumer values and sanitizes consumer failures", async () => {
    const current = target();
    expect(await current.store("")).toEqual({ ok: false, code: "INVALID_SECRET" });
    expect(await current.store(null as string)).toEqual({ ok: false, code: "INVALID_SECRET" });
    const id = await save(current);
    expect(await current.replace(id, "")).toEqual({ ok: false, code: "INVALID_SECRET" });
    const echo = ((secret: string) => secret) as unknown as (secret: string) => void;
    expect(await current.use(id, echo)).toEqual({ ok: true, persistence });
    expect(await current.use(id, () => { throw new Error(SENTINEL); })).toEqual({ ok: false, code: "CONSUMER_FAILED" });
    // Consumers may deliberately forget their credential without queue deadlock.
    expect(await current.use(id, async () => { await current.forget(id); })).toEqual({ ok: true, persistence });
    expect(await current.status(id)).toMatchObject({ state: "missing" });
  });
});

describe("protected records", () => {
  it("preserves failures and recovers through the authorized credential boundary", async () => {
    const entry = "dungeon-jockey://app/index.html";
    const contents = { session: {}, mainFrame: { parent: null as null, detached: false, url: entry },
      isDestroyed: () => false, getURL: () => entry } as unknown as WebContents;
    const event = { sender: contents, senderFrame: contents.mainFrame } as IpcMainInvokeEvent;
    const registry = new RendererRoleRegistry();
    registry.register(contents, "application", createApplicationEntryPolicy(entry, true));
    const handlers = createCredentialHandlers(registry, () => store);
    const call = async (operation: CredentialOperation, payload: unknown) => {
      const result = await handlers.handler(operation)(event, { id: "123e4567-e89b-42d3-a456-426614174000",
        protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], payload });
      expect(parseCredentialResult(result, operation)).toEqual(result);
      expect(JSON.stringify(result).includes(FAKE) || JSON.stringify(result).includes(REPLACEMENT) || JSON.stringify(result).includes(SENTINEL)).toBe(false);
      return result;
    };
    const saved = await call("store", { secret: FAKE });
    if (!saved.ok) throw new Error("Fake IPC credential save failed");
    const credentialId = saved.credentialId;
    const before = await fs.readFile(filename(credentialId));
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "available", persistence: "remembered" } });
    protection.isAsyncEncryptionAvailable.mockResolvedValue(false);
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "unavailable", persistence: "remembered" } });
    expect(await call("replace", { credentialId, secret: REPLACEMENT })).toMatchObject({ error: { code: "SECRET_UNAVAILABLE" } });
    expect(await fs.readFile(filename(credentialId))).toEqual(before);
    protection.isAsyncEncryptionAvailable.mockResolvedValue(true);
    protection.encryptStringAsync.mockRejectedValueOnce(new Error(SENTINEL));
    expect(await call("replace", { credentialId, secret: REPLACEMENT })).toMatchObject({ error: { code: "SECRET_UNAVAILABLE" } });
    expect(await fs.readFile(filename(credentialId))).toEqual(before);
    protection.decryptStringAsync.mockRejectedValueOnce(new Error(SENTINEL));
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "unavailable" } });
    expect(await fs.readFile(filename(credentialId))).toEqual(before);
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "available" } });
    await expectUse(store, credentialId, FAKE);
    expect(await call("replace", { credentialId, secret: REPLACEMENT })).toMatchObject({ ok: true, persistence: "remembered" });
    store = createProtectedSecretStore(root, protection);
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "available", persistence: "remembered" } });
    await expectUse(store, credentialId, REPLACEMENT);
    expect(await call("forget", { credentialId })).toMatchObject({ ok: true });
    expect(await call("status", { credentialId })).toMatchObject({ status: { state: "missing", persistence: "remembered" } });
    expect(await call("replace", { credentialId, secret: REPLACEMENT })).toMatchObject({ error: { code: "CREDENTIAL_MISSING" } });
  });

  it("persists only ciphertext in its profile and survives reconstruction", async () => {
    const id = await save();
    const text = await fs.readFile(filename(id), "utf8");
    expect(Object.keys(JSON.parse(text))).toEqual(["version", "ciphertext"]);
    expect(text).not.toContain(FAKE);
    expect(Buffer.from(JSON.parse(text).ciphertext, "base64").includes(Buffer.from(FAKE))).toBe(false);
    expect(await fs.readdir(root)).toEqual(["Protected Credentials"]);
    expect(await fs.readdir(directory)).toEqual([path.basename(filename(id))]);
    await expectUse(createProtectedSecretStore(root, protection), id, FAKE);
    expect(await createProtectedSecretStore(path.join(root, "other"), protection).status(id)).toMatchObject({ state: "missing" });
    if (process.platform !== "win32") {
      expect((await fs.stat(directory)).mode & 0o777).toBe(0o700);
      expect((await fs.stat(filename(id))).mode & 0o777).toBe(0o600);
    }
  });

  it("uses exclusive restricted same-directory temporary writes and syncs before publish", async () => {
    const open = vi.spyOn(fs, "open");
    const rename = vi.spyOn(fs, "rename");
    const id = await save();
    const [temporary, flag, mode] = open.mock.calls[0];
    expect(path.dirname(temporary as string)).toBe(directory);
    expect(flag).toBe("wx");
    expect(mode).toBe(0o600);
    expect(rename).toHaveBeenCalledWith(temporary, filename(id));
  });

  it.each(["not json", '{"version":2,"ciphertext":"YQ=="}', '{"version":1,"ciphertext":"!"}', '{"version":1,"ciphertext":""}', '{"version":1,"ciphertext":"YQ==","extra":"fake"}'])(
    "retains malformed records as unavailable: %s", async (malformed) => {
      const id = await save();
      await fs.writeFile(filename(id), malformed);
      expect(await store.status(id)).toMatchObject({ state: "unavailable", code: "SECRET_UNAVAILABLE" });
      const consume = vi.fn();
      expect(await store.use(id, consume)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
      expect(consume).not.toHaveBeenCalled();
      expect(await fs.readFile(filename(id), "utf8")).toBe(malformed);
      expect(await store.forget(id)).toMatchObject({ ok: true });
    },
  );

  it.each(["EACCES", "ENOENT"])("treats observed but unreadable records as unavailable (%s)", async (code) => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    const read = vi.spyOn(fs, "readFile").mockRejectedValueOnce(Object.assign(new Error(SENTINEL), { code }));
    expect(await store.status(id)).toEqual({ state: "unavailable", persistence: "remembered", code: "SECRET_UNAVAILABLE" });
    read.mockRestore();
    expect(await fs.readFile(filename(id))).toEqual(before);
    await expectUse(store, id, FAKE);
  });

  it("treats non-files and permission failures in lookup as unavailable", async () => {
    await fs.mkdir(filename(ABSENT), { recursive: true });
    expect(await store.status(ABSENT)).toMatchObject({ state: "unavailable" });
    vi.spyOn(fs, "lstat").mockRejectedValueOnce(Object.assign(new Error(SENTINEL), { code: "EACCES" }));
    expect(await store.status(ABSENT)).toMatchObject({ state: "unavailable" });
  });

  it("fails closed when protection is unavailable, preserves records, and retries", async () => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    protection.isAsyncEncryptionAvailable.mockResolvedValue(false);
    expect(await store.status(ABSENT)).toMatchObject({ state: "missing" });
    expect(await store.status(id)).toMatchObject({ state: "unavailable" });
    expect(await store.store(REPLACEMENT)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(await store.replace(id, REPLACEMENT)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    const consume = vi.fn();
    expect(await store.use(id, consume)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(consume).not.toHaveBeenCalled();
    expect(await fs.readFile(filename(id))).toEqual(before);
    protection.isAsyncEncryptionAvailable.mockResolvedValue(true);
    await expectUse(store, id, FAKE);
  });

  it("sanitizes rejected availability and decryption, and permits deliberate replacement", async () => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    protection.isAsyncEncryptionAvailable.mockRejectedValueOnce(new Error(SENTINEL));
    expect(await store.status(id)).toMatchObject({ state: "unavailable", code: "SECRET_UNAVAILABLE" });
    protection.decryptStringAsync.mockRejectedValueOnce(new Error(SENTINEL));
    expect(await store.use(id, vi.fn())).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(await fs.readFile(filename(id))).toEqual(before);
    await expectUse(store, id, FAKE);
    protection.decryptStringAsync.mockRejectedValue(new Error(SENTINEL));
    expect(await store.replace(id, REPLACEMENT)).toMatchObject({ ok: true });
    expect(await store.forget(id)).toMatchObject({ ok: true });
  });

  it.each(["encrypt", "publish", "write", "sync"])("preserves prior bytes and cleans temporary writes on failed %s", async (stage) => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    if (stage === "encrypt") protection.encryptStringAsync.mockRejectedValueOnce(new Error(SENTINEL));
    if (stage === "publish") vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error(SENTINEL));
    if (stage === "write" || stage === "sync") {
      const open = fs.open.bind(fs);
      vi.spyOn(fs, "open").mockImplementationOnce(async (...args) => {
        const handle = await open(...args);
        if (stage === "write") vi.spyOn(handle, "writeFile").mockRejectedValueOnce(new Error(SENTINEL));
        else vi.spyOn(handle, "sync").mockRejectedValueOnce(new Error(SENTINEL));
        return handle;
      });
    }
    expect(await store.replace(id, REPLACEMENT)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(await fs.readFile(filename(id))).toEqual(before);
    expect(await fs.readdir(directory)).toEqual([path.basename(filename(id))]);
    await expectUse(store, id, FAKE);
    expect(await store.replace(id, REPLACEMENT)).toMatchObject({ ok: true });
    await expectUse(store, id, REPLACEMENT);
  });

  it("rotates before status reports available and before a consumer receives plaintext", async () => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    protection.decryptStringAsync.mockResolvedValueOnce({ result: FAKE, shouldReEncrypt: true });
    expect(await store.status(id)).toMatchObject({ state: "available" });
    expect(await fs.readFile(filename(id))).not.toEqual(before);
    const rotated = await fs.readFile(filename(id));
    protection.decryptStringAsync.mockResolvedValueOnce({ result: FAKE, shouldReEncrypt: true });
    expect(await store.use(id, async (value) => {
      expect(value).toBe(FAKE);
      expect(await fs.readFile(filename(id))).not.toEqual(rotated);
    })).toMatchObject({ ok: true });
    await expectUse(createProtectedSecretStore(root, protection), id, FAKE);
  });

  it.each(["encrypt", "publish"])("withholds plaintext when rotation fails at %s and recovers", async (stage) => {
    const id = await save();
    const before = await fs.readFile(filename(id));
    protection.decryptStringAsync.mockResolvedValueOnce({ result: FAKE, shouldReEncrypt: true });
    if (stage === "encrypt") protection.encryptStringAsync.mockRejectedValueOnce(new Error(SENTINEL));
    else vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error(SENTINEL));
    const consume = vi.fn();
    expect(await store.use(id, consume)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    expect(consume).not.toHaveBeenCalled();
    expect(await fs.readFile(filename(id))).toEqual(before);
    expect(await fs.readdir(directory)).toEqual([path.basename(filename(id))]);
    protection.decryptStringAsync.mockResolvedValueOnce({ result: FAKE, shouldReEncrypt: true });
    await expectUse(store, id, FAKE);
    expect(await fs.readFile(filename(id))).not.toEqual(before);
  });

  it.each(["replace", "forget"] as const)("orders slow rotation before a concurrent %s without stale restoration", async (operation) => {
    const id = await save();
    const started = deferred();
    const release = deferred();
    protection.decryptStringAsync.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
      return { result: FAKE, shouldReEncrypt: true };
    });
    const rotating = store.status(id);
    await started.promise;
    const mutation = operation === "replace" ? store.replace(id, REPLACEMENT) : store.forget(id);
    release.resolve();
    expect(await rotating).toMatchObject({ state: "available" });
    expect(await mutation).toMatchObject({ ok: true });
    if (operation === "replace") await expectUse(store, id, REPLACEMENT);
    else expect(await store.status(id)).toMatchObject({ state: "missing" });
  });

  it("sanitizes forget failures and preserves the record for retry", async () => {
    const id = await save();
    vi.spyOn(fs, "unlink").mockRejectedValueOnce(new Error(SENTINEL));
    expect(await store.forget(id)).toEqual({ ok: false, code: "SECRET_UNAVAILABLE" });
    await expectUse(store, id, FAKE);
    expect(await store.forget(id)).toMatchObject({ ok: true });
  });
});
