import { parseRequestId, RequestId } from "../domain/ids/ids";
import {
  assertBoundarySerializable,
  RuntimeSchema,
  RuntimeSchemaValidationError,
} from "./runtimeSchema";

export const INITIAL_PROTOCOL_VERSION = 1 as const;

export type CommandEnvelope<TType extends string, TPayload> = Readonly<{
  id: RequestId;
  type: TType;
  payload: TPayload;
  protocolVersion: typeof INITIAL_PROTOCOL_VERSION;
}>;

export type EventEnvelope<TType extends string, TPayload> = Readonly<{
  sequence: number;
  type: TType;
  payload: TPayload;
  protocolVersion: typeof INITIAL_PROTOCOL_VERSION;
}>;

type EnvelopeSchemas<TType extends string, TPayload> = Readonly<{
  type: RuntimeSchema<TType>;
  payload: RuntimeSchema<TPayload>;
}>;

function parseEnvelopeRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  assertBoundarySerializable(value);

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RuntimeSchemaValidationError("envelope object");
  }

  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    throw new RuntimeSchemaValidationError("exact envelope fields");
  }

  return value as Record<string, unknown>;
}

function parseProtocolVersion(value: unknown): typeof INITIAL_PROTOCOL_VERSION {
  if (value !== INITIAL_PROTOCOL_VERSION) {
    throw new RuntimeSchemaValidationError(
      `protocol version ${INITIAL_PROTOCOL_VERSION}`,
    );
  }
  return INITIAL_PROTOCOL_VERSION;
}

function parseEnvelopeType<TType extends string>(
  value: unknown,
  schema: RuntimeSchema<TType>,
): TType {
  if (typeof value !== "string" || value.length === 0) {
    throw new RuntimeSchemaValidationError("non-empty command or event type");
  }
  return schema.parse(value);
}

export function parseCommandEnvelope<TType extends string, TPayload>(
  value: unknown,
  schemas: EnvelopeSchemas<TType, TPayload>,
): CommandEnvelope<TType, TPayload> {
  const record = parseEnvelopeRecord(value, [
    "id",
    "payload",
    "protocolVersion",
    "type",
  ]);
  const payload = schemas.payload.parse(record.payload);
  assertBoundarySerializable(payload);

  return Object.freeze({
    id: parseRequestId(record.id),
    type: parseEnvelopeType(record.type, schemas.type),
    payload,
    protocolVersion: parseProtocolVersion(record.protocolVersion),
  });
}

export function parseEventEnvelope<TType extends string, TPayload>(
  value: unknown,
  schemas: EnvelopeSchemas<TType, TPayload>,
): EventEnvelope<TType, TPayload> {
  const record = parseEnvelopeRecord(value, [
    "payload",
    "protocolVersion",
    "sequence",
    "type",
  ]);
  if (!Number.isInteger(record.sequence) || Number(record.sequence) < 0) {
    throw new RuntimeSchemaValidationError(
      "non-negative integer event sequence",
    );
  }
  const payload = schemas.payload.parse(record.payload);
  assertBoundarySerializable(payload);

  return Object.freeze({
    sequence: Number(record.sequence),
    type: parseEnvelopeType(record.type, schemas.type),
    payload,
    protocolVersion: parseProtocolVersion(record.protocolVersion),
  });
}
