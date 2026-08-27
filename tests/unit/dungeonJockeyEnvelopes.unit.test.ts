import { describe, expect, it } from "vitest";

import {
  INITIAL_PROTOCOL_VERSION,
  parseCommandEnvelope,
  parseEventEnvelope,
} from "../../src/dungeonJockey/contracts/envelopes";
import {
  createRuntimeSchema,
  literalStringSchema,
} from "../../src/dungeonJockey/contracts/runtimeSchema";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const type = literalStringSchema("kernel.test");
const payload = createRuntimeSchema<{ count: number }>(
  "non-negative count payload",
  (value): value is { count: number } =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as { count?: unknown }).count === "number" &&
    Number.isInteger((value as { count: number }).count) &&
    (value as { count: number }).count >= 0,
);
const nestedPayload = createRuntimeSchema<{ items: unknown[] }>(
  "nested array payload",
  (value): value is { items: unknown[] } =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as { items?: unknown }).items),
);

function parseItems(items: unknown[]) {
  return parseCommandEnvelope(
    {
      id: UUID,
      type: "kernel.test",
      payload: { items },
      protocolVersion: INITIAL_PROTOCOL_VERSION,
    },
    { type, payload: nestedPayload },
  );
}

describe("command and event envelopes", () => {
  it("accepts valid typed command and event values", () => {
    expect(
      parseCommandEnvelope(
        {
          id: UUID,
          type: "kernel.test",
          payload: { count: 2 },
          protocolVersion: INITIAL_PROTOCOL_VERSION,
        },
        { type, payload },
      ),
    ).toEqual({
      id: UUID,
      type: "kernel.test",
      payload: { count: 2 },
      protocolVersion: 1,
    });

    expect(
      parseEventEnvelope(
        {
          sequence: 0,
          type: "kernel.test",
          payload: { count: 3 },
          protocolVersion: INITIAL_PROTOCOL_VERSION,
        },
        { type, payload },
      ),
    ).toEqual({
      sequence: 0,
      type: "kernel.test",
      payload: { count: 3 },
      protocolVersion: 1,
    });
  });

  it.each([
    ["malformed ID", { id: "bad-id" }],
    ["protocol version", { protocolVersion: 2 }],
    ["type", { type: "other.type" }],
    ["payload", { payload: { count: -1 } }],
  ])("rejects a command with an invalid %s", (_, replacement) => {
    expect(() =>
      parseCommandEnvelope(
        {
          id: UUID,
          type: "kernel.test",
          payload: { count: 1 },
          protocolVersion: 1,
          ...replacement,
        },
        { type, payload },
      ),
    ).toThrow();
  });

  it.each([-1, 1.5])("rejects an invalid event sequence: %s", (sequence) => {
    expect(() =>
      parseEventEnvelope(
        {
          sequence,
          type: "kernel.test",
          payload: { count: 1 },
          protocolVersion: 1,
        },
        { type, payload },
      ),
    ).toThrow("non-negative integer event sequence");
  });

  it("rejects runtime objects even when a caller schema accepts them", () => {
    class UnsafePayload {
      count = 1;
    }
    const unsafePayload = createRuntimeSchema<UnsafePayload>(
      "unsafe payload",
      (value): value is UnsafePayload => value instanceof UnsafePayload,
    );

    expect(() =>
      parseCommandEnvelope(
        {
          id: UUID,
          type: "kernel.test",
          payload: new UnsafePayload(),
          protocolVersion: 1,
        },
        { type, payload: unsafePayload },
      ),
    ).toThrow("plain JSON object");
  });

  it("rejects an array index accessor without invoking it", () => {
    const items = ["safe"];
    let getterCalls = 0;
    Object.defineProperty(items, "0", {
      get() {
        getterCalls += 1;
        return "unsafe";
      },
      enumerable: true,
      configurable: true,
    });

    expect(() => parseItems(items)).toThrow("dense JSON array fields");
    expect(getterCalls).toBe(0);
  });

  it("rejects sparse nested arrays", () => {
    const items = new Array(2);
    items[1] = "present";

    expect(() => parseItems(items)).toThrow("dense JSON array fields");
  });

  it.each([
    [
      "string",
      () => {
        const array = [1];
        Object.defineProperty(array, "extra", {
          value: true,
          enumerable: true,
        });
        return array;
      },
    ],
    [
      "symbol",
      () => {
        const array = [1];
        Object.defineProperty(array, Symbol("extra"), {
          value: true,
          enumerable: true,
        });
        return array;
      },
    ],
  ])("rejects an array with an unexpected own %s field", (_, createArray) => {
    expect(() => parseItems(createArray())).toThrow("dense JSON array fields");
  });

  it("retains ordinary dense nested array envelope behavior", () => {
    const items = [{ values: [1, true, null] }];
    const result = parseItems(items);

    expect(result.payload).toEqual({ items });
    expect(result.payload.items).toBe(items);
  });
});
