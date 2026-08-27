import { UuidFactory } from "./UuidFactory";

declare const uuidBrand: unique symbol;

type BrandedUuid<TBrand extends string> = string & {
  readonly [uuidBrand]: TBrand;
};

export type RequestId = BrandedUuid<"RequestId">;
export type DungeonJockeySessionId = BrandedUuid<"DungeonJockeySessionId">;

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_UUID_PATTERN.test(value);
}

function parseUuid<TBrand extends string>(
  value: unknown,
  identifierName: string,
): BrandedUuid<TBrand> {
  if (!isCanonicalUuid(value)) {
    throw new Error(`${identifierName} must be a canonical UUID`);
  }

  return value as BrandedUuid<TBrand>;
}

export function parseRequestId(value: unknown): RequestId {
  return parseUuid<"RequestId">(value, "Request ID");
}

export function createRequestId(factory: UuidFactory): RequestId {
  return parseRequestId(factory.createUuid());
}

export function parseDungeonJockeySessionId(
  value: unknown,
): DungeonJockeySessionId {
  return parseUuid<"DungeonJockeySessionId">(
    value,
    "Dungeon Jockey session ID",
  );
}

export function createDungeonJockeySessionId(
  factory: UuidFactory,
): DungeonJockeySessionId {
  return parseDungeonJockeySessionId(factory.createUuid());
}
