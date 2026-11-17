import type { SerializedApplicationError } from "../domain/errors/ApplicationError";
import { CredentialId, parseCredentialId } from "../domain/ids/CredentialId";
import { parseRequestId, RequestId } from "../domain/ids/ids";
import { CommandEnvelope, parseCommandEnvelope } from "./envelopes";
import { literalStringSchema, RuntimeSchemaValidationError } from "./runtimeSchema";

/** Transport limit only; the main-owned storage port has its own contract. */
export const MAX_CREDENTIAL_SECRET_BYTES = 16 * 1024;
export const CREDENTIAL_CHANNELS = Object.freeze({
  store: "dungeon-jockey:v1:store-credential",
  status: "dungeon-jockey:v1:get-credential-status",
  replace: "dungeon-jockey:v1:replace-credential",
  forget: "dungeon-jockey:v1:forget-credential",
});
export const CREDENTIAL_OPERATIONS = Object.freeze({
  store: "application.storeCredential",
  status: "application.getCredentialStatus",
  replace: "application.replaceCredential",
  forget: "application.forgetCredential",
} as const);
export type CredentialOperation = keyof typeof CREDENTIAL_OPERATIONS;
type Payloads = {
  store: Readonly<{ secret: string }>;
  status: Readonly<{ credentialId: CredentialId }>;
  replace: Readonly<{ credentialId: CredentialId; secret: string }>;
  forget: Readonly<{ credentialId: CredentialId }>;
};
export type CredentialRequest<K extends CredentialOperation = CredentialOperation> = {
  [P in K]: CommandEnvelope<typeof CREDENTIAL_OPERATIONS[P], Payloads[P]>;
}[K];
export type CredentialPersistence = "remembered" | "session-only" | "unsupported";
export type CredentialStatus = Readonly<{
  state: "available" | "missing" | "unavailable";
  persistence: CredentialPersistence;
}>;
type Correlation<K extends CredentialOperation> = Readonly<{
  protocolVersion: 1;
  type: typeof CREDENTIAL_OPERATIONS[K];
  id: RequestId;
}>;
export type CredentialResult<K extends CredentialOperation = CredentialOperation> =
  | (Correlation<K> & Readonly<{
      ok: true;
      credentialId: CredentialId;
    }> & (K extends "status" ? Readonly<{ status: CredentialStatus }>
      : Readonly<{ persistence: CredentialPersistence }>))
  | Readonly<{
      ok: false;
      protocolVersion: 1;
      type: typeof CREDENTIAL_OPERATIONS[K];
      id: RequestId | null;
      error: SerializedApplicationError;
    }>;

function invalid(): never {
  throw new RuntimeSchemaValidationError("bounded credential contract");
}

/** Inspect only this fixed-depth record's data descriptors, never child values. */
function fields(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object") invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  if (Reflect.ownKeys(value).length !== keys.length) invalid();
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) invalid();
    result[key] = descriptor.value;
  }
  return result;
}

function credentialId(value: unknown): CredentialId {
  if (typeof value !== "string" || value.length !== 36) invalid();
  return parseCredentialId(value);
}

function requestId(value: unknown): RequestId {
  if (typeof value !== "string" || value.length !== 36) invalid();
  return parseRequestId(value);
}

export function parseCredentialRequest<K extends CredentialOperation>(
  value: unknown,
  operation: K,
): CredentialRequest<K> {
  const record = fields(value, ["id", "type", "protocolVersion", "payload"]);
  requestId(record.id);
  if (record.protocolVersion !== 1 || record.type !== CREDENTIAL_OPERATIONS[operation]) invalid();
  const keys = operation === "store" ? ["secret"]
    : operation === "replace" ? ["credentialId", "secret"] : ["credentialId"];
  const payload = fields(record.payload, keys);
  if (operation !== "store") credentialId(payload.credentialId);
  if (operation === "store" || operation === "replace") {
    // Bound UTF-16 length before allocating/measuring UTF-8. Each code unit
    // needs at least one byte, including replacement of unpaired surrogates.
    if (typeof payload.secret !== "string" || payload.secret.length === 0 ||
        payload.secret.length > MAX_CREDENTIAL_SECRET_BYTES) invalid();
    if (new TextEncoder().encode(payload.secret).byteLength > MAX_CREDENTIAL_SECRET_BYTES) invalid();
  }
  // Only the bounded snapshot reaches the shared recursive envelope validator.
  return parseCommandEnvelope({ ...record, payload }, {
    type: literalStringSchema(CREDENTIAL_OPERATIONS[operation]),
    payload: { description: "bounded credential payload", parse: () => Object.freeze(payload) },
  }) as CredentialRequest<K>;
}

export function parseCredentialPersistence(value: unknown): CredentialPersistence {
  if (value !== "remembered" && value !== "session-only" && value !== "unsupported") invalid();
  return value;
}

/** Reply schemas are exact and bounded as well; dependency extras never belong here. */
export function parseCredentialResult<K extends CredentialOperation>(
  value: unknown,
  operation: K,
): CredentialResult<K> {
  if (value === null || typeof value !== "object") invalid();
  const ok = Object.getOwnPropertyDescriptor(value, "ok");
  if (!ok || !("value" in ok) || typeof ok.value !== "boolean") invalid();
  const keys = ["ok", "protocolVersion", "type", "id"];
  const record = fields(value, [...keys, ...(ok.value
    ? ["credentialId", operation === "status" ? "status" : "persistence"] : ["error"])]);
  if (record.protocolVersion !== 1 || record.type !== CREDENTIAL_OPERATIONS[operation]) invalid();
  if (record.ok) {
    requestId(record.id);
    credentialId(record.credentialId);
    if (operation === "status") {
      const status = fields(record.status, ["state", "persistence"]);
      if (status.state !== "available" && status.state !== "missing" && status.state !== "unavailable") invalid();
      parseCredentialPersistence(status.persistence);
    } else parseCredentialPersistence(record.persistence);
  } else {
    if (record.id !== null) requestId(record.id);
    const error = fields(record.error, ["code", "message", "retryable"]);
    if (typeof error.code !== "string" || error.code.length > 64 || !/^[A-Z][A-Z0-9_]*$/.test(error.code) ||
        typeof error.message !== "string" || error.message.length === 0 || error.message.length > 128 ||
        typeof error.retryable !== "boolean") invalid();
  }
  return value as CredentialResult<K>;
}
