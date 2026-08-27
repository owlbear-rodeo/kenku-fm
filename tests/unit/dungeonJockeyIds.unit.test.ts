import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { UuidFactory } from "../../src/dungeonJockey/domain/ids/UuidFactory";
import {
  createDungeonJockeySessionId,
  createRequestId,
  parseDungeonJockeySessionId,
  parseRequestId,
} from "../../src/dungeonJockey/domain/ids/ids";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("Dungeon Jockey identifiers", () => {
  it("brands the same validated UUID representation as distinct ID types", () => {
    const requestId = parseRequestId(UUID);
    const sessionId = parseDungeonJockeySessionId(UUID);

    expect(requestId).toBe(UUID);
    expect(sessionId).toBe(UUID);
    expectTypeOf(requestId).not.toEqualTypeOf(sessionId);
  });

  it("uses an injected UUID factory deterministically", () => {
    const createUuid = vi.fn(() => UUID);
    const factory: UuidFactory = { createUuid };

    expect(createRequestId(factory)).toBe(UUID);
    expect(createDungeonJockeySessionId(factory)).toBe(UUID);
    expect(createUuid).toHaveBeenCalledTimes(2);
  });

  it.each(["not-a-uuid", "123E4567-E89B-42D3-A456-426614174000", ""])(
    "rejects malformed or non-canonical UUID input: %s",
    (value) => {
      expect(() => parseRequestId(value)).toThrow("canonical UUID");
    },
  );
});
