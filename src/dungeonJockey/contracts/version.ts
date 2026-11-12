import type { SerializedApplicationError } from "../domain/errors/ApplicationError";
import type { RequestId } from "../domain/ids/ids";
import { CommandEnvelope, parseCommandEnvelope } from "./envelopes";
import {
  createRuntimeSchema,
  literalStringSchema,
  RuntimeSchemaValidationError,
} from "./runtimeSchema";

export const VERSION_CHANNEL = "dungeon-jockey:v1:get-version";
export const VERSION_OPERATION = "application.getVersion";
export type VersionRequest = CommandEnvelope<
  typeof VERSION_OPERATION,
  Readonly<Record<string, never>>
>;
export type VersionResult =
  | Readonly<{ ok: true; protocolVersion: 1; id: RequestId; version: string }>
  | Readonly<{
      ok: false;
      protocolVersion: 1;
      id: RequestId | null;
      error: SerializedApplicationError;
    }>;

export interface ApplicationBridge {
  getVersion(): Promise<VersionResult>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

const emptyPayload = createRuntimeSchema<Readonly<Record<string, never>>>(
  "exact empty version payload",
  (value): value is Readonly<Record<string, never>> =>
    isPlainRecord(value) && Reflect.ownKeys(value).length === 0,
);

export function parseVersionRequest(value: unknown): VersionRequest {
  // Bound the shape before the shared recursive JSON validator. Accepted input
  // has exactly four fields, a 36-character ID, a fixed type, and no payload data.
  // Never traverse arbitrary nested request data or stringify it to measure it.
  const invalid = () => {
    throw new RuntimeSchemaValidationError("bounded version request");
  };
  if (!isPlainRecord(value) || Reflect.ownKeys(value).length !== 4) invalid();
  const record = value as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const key of ["id", "type", "protocolVersion", "payload"]) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      invalid();
    }
    fields[key] = descriptor.value;
  }
  if (
    typeof fields.id !== "string" ||
    fields.id.length !== 36 ||
    fields.type !== VERSION_OPERATION ||
    fields.protocolVersion !== 1
  )
    invalid();
  emptyPayload.parse(fields.payload);
  return parseCommandEnvelope(value, {
    type: literalStringSchema(VERSION_OPERATION),
    payload: emptyPayload,
  });
}
