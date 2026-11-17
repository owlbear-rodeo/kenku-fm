import { describe, expect, it, vi } from "vitest";
import {
  CREDENTIAL_OPERATIONS, CredentialOperation, MAX_CREDENTIAL_SECRET_BYTES,
  parseCredentialRequest, parseCredentialResult,
} from "../../src/dungeonJockey/contracts/credentials";

const id = "123e4567-e89b-42d3-a456-426614174000";
const credentialId = "00000000-0000-4000-8000-000000000001";
const secret = "fake-contract-secret";
const operations = Object.keys(CREDENTIAL_OPERATIONS) as CredentialOperation[];
function request(operation: CredentialOperation) {
  return { id, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation],
    payload: operation === "store" ? { secret } : operation === "replace" ? { credentialId, secret } : { credentialId } };
}

describe.each(operations)("credential %s contracts", (operation) => {
  it("accepts exactly the canonical envelope and operation", () => {
    expect(parseCredentialRequest(request(operation), operation)).toEqual(request(operation));
  });

  it("rejects malformed, nested, oversized, accessor and unsupported requests without traversing data", () => {
    const valid = request(operation);
    const inspect = vi.fn(() => { throw new Error(secret); });
    const nested = new Proxy({}, { getPrototypeOf: inspect, ownKeys: inspect, get: inspect });
    const accessor = { ...valid };
    Object.defineProperty(accessor, "payload", { get: inspect });
    const payloadAccessor = { ...valid.payload };
    Object.defineProperty(payloadAccessor, Object.keys(payloadAccessor)[0], { get: inspect });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const invalid = [null, [], {}, new Date(),
      { ...valid, protocolVersion: 2 }, { ...valid, type: "application.useCredential" },
      { ...valid, type: "x".repeat(100000) },
      { ...valid, id: id.toUpperCase() }, { ...valid, id: "x".repeat(100000) },
      { ...valid, id: nested }, { ...valid, extra: nested },
      { ...valid, payload: null }, { ...valid, payload: [] }, { ...valid, payload: cycle },
      { ...valid, payload: { ...valid.payload, extra: nested } },
      { ...valid, payload: { [Symbol("extra")]: true } }, accessor,
      { ...valid, payload: payloadAccessor },
      { ...valid, payload: { ...valid.payload, [Object.keys(valid.payload)[0]]: nested } },
    ];
    for (const value of invalid) expect(() => parseCredentialRequest(value, operation)).toThrow();
    expect(inspect).not.toHaveBeenCalled();
    if (operation !== "store") {
      for (const credentialId of ["../record", id.toUpperCase(), "x".repeat(100000), null, 42, nested]) {
        expect(() => parseCredentialRequest({ ...valid, payload: { ...valid.payload, credentialId } }, operation)).toThrow();
      }
    }
    expect(inspect).not.toHaveBeenCalled();
  });

  it("bounds exact JSON-safe reply shapes and canonical correlation", () => {
    const result = { ok: true, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id, credentialId,
      ...(operation === "status" ? { status: { state: "available", persistence: "remembered" } } : { persistence: "remembered" }) };
    expect(parseCredentialResult(result, operation)).toEqual(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    const failure = { ok: false, protocolVersion: 1, type: CREDENTIAL_OPERATIONS[operation], id: null as null,
      error: { code: "SECRET_UNAVAILABLE", message: "The credential operation is unavailable.", retryable: false } };
    expect(parseCredentialResult(failure, operation)).toEqual(failure);
    for (const value of [
      { ...result, extra: secret }, { ...result, credentialId: "invalid" },
      { ...result, id: "invalid" }, { ...result, protocolVersion: 2 },
      { ...result, type: "other" }, { ...result, ok: 1 },
      { ...result, ...(operation === "status" ? { status: { state: secret, persistence: "remembered" } } : { persistence: secret }) },
      { ...failure, error: { ...failure.error, cause: secret } },
      { ...failure, error: { ...failure.error, message: "x".repeat(129) } },
    ]) expect(() => parseCredentialResult(value, operation)).toThrow();
    const getter = vi.fn(() => secret);
    const accessor = Object.defineProperty({ ...result }, "id", { get: getter });
    expect(() => parseCredentialResult(accessor, operation)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    for (const persistence of ["remembered", "session-only", "unsupported"]) {
      for (const state of ["available", "missing", "unavailable"]) {
        expect(() => parseCredentialResult({ ...result,
          ...(operation === "status" ? { status: { state, persistence } } : { persistence }),
        }, operation)).not.toThrow();
      }
    }
  });
});

describe.each(["store", "replace"] as const)("%s secret bounds", (operation) => {
  it("measures UTF-8 after a bounded string-length check", () => {
    for (const secret of ["a".repeat(MAX_CREDENTIAL_SECRET_BYTES), "é".repeat(8192), "😀".repeat(4096)]) {
      expect(() => parseCredentialRequest({ ...request(operation), payload: { ...request(operation).payload, secret } }, operation)).not.toThrow();
    }
    for (const secret of ["", null, false, 123, {}, [], "a".repeat(16385), "é".repeat(8193), "😀".repeat(4097)]) {
      expect(() => parseCredentialRequest({ ...request(operation), payload: { ...request(operation).payload, secret } }, operation)).toThrow();
    }
    const encode = vi.spyOn(TextEncoder.prototype, "encode");
    expect(() => parseCredentialRequest({ ...request(operation), payload: { ...request(operation).payload, secret: "a".repeat(100000) } }, operation)).toThrow();
    expect(encode).not.toHaveBeenCalled();
    encode.mockRestore();
  });
});
