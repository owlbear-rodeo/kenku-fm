import { describe, expect, it } from "vitest";

import { ApplicationError } from "../../src/dungeonJockey/domain/errors/ApplicationError";

describe("structured application errors", () => {
  it("serializes a stable safe shape without its internal cause", () => {
    const cause = new Error("private diagnostic detail");
    const error = new ApplicationError("SOURCE_UNAVAILABLE", "Source unavailable", {
      retryable: true,
      details: { sourceKind: "browser", attempts: 2 },
      cause,
    });

    expect(error.getCauseForLocalDebugging()).toBe(cause);
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      code: "SOURCE_UNAVAILABLE",
      message: "Source unavailable",
      retryable: true,
      details: { sourceKind: "browser", attempts: 2 },
    });
    expect(JSON.stringify(error)).not.toContain("private diagnostic detail");
    expect(Object.keys(error)).not.toContain("internalCause");
  });

  it("converts unknown failures without exposing their message or stack", () => {
    const error = ApplicationError.fromUnknown(
      new Error("token=secret-value should remain internal"),
    );
    const serialized = JSON.stringify(error);

    expect(JSON.parse(serialized)).toEqual({
      code: "UNEXPECTED_FAILURE",
      message: "An unexpected application error occurred.",
      retryable: false,
    });
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("stack");
  });

  it("preserves an own __proto__ detail as data without changing the clone prototype", () => {
    const details: Record<string, unknown> = {};
    Object.defineProperty(details, "__proto__", {
      value: { inherited: true },
      enumerable: true,
      configurable: true,
      writable: true,
    });

    const error = new ApplicationError("SAFE_DETAILS", "Safe details", {
      details,
    });
    const cloned = error.details as Record<string, unknown>;
    const descriptor = Object.getOwnPropertyDescriptor(cloned, "__proto__");

    expect(Object.getPrototypeOf(cloned)).toBe(Object.prototype);
    expect((cloned as { inherited?: unknown }).inherited).toBeUndefined();
    expect(descriptor).toMatchObject({ enumerable: true });
    expect(descriptor?.value).toEqual({ inherited: true });

    const serialized = JSON.parse(JSON.stringify(error)) as {
      details: Record<string, unknown>;
    };
    expect(
      Object.prototype.hasOwnProperty.call(serialized.details, "__proto__"),
    ).toBe(true);
    expect(serialized.details["__proto__"]).toEqual({ inherited: true });
  });

  it("rejects a nested array index accessor without invoking it", () => {
    const nested = ["safe"];
    let getterCalls = 0;
    Object.defineProperty(nested, "0", {
      get() {
        getterCalls += 1;
        return "unsafe";
      },
      enumerable: true,
      configurable: true,
    });

    expect(
      () =>
        new ApplicationError("UNSAFE_DETAILS", "Unsafe details", {
          details: { nested },
        }),
    ).toThrow("dense data fields");
    expect(getterCalls).toBe(0);
  });

  it("rejects sparse nested arrays", () => {
    const sparse = new Array(2);
    sparse[1] = "present";

    expect(
      () =>
        new ApplicationError("UNSAFE_DETAILS", "Unsafe details", {
          details: { sparse },
        }),
    ).toThrow("dense data fields");
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
    expect(
      () =>
        new ApplicationError("UNSAFE_DETAILS", "Unsafe details", {
          details: { nested: createArray() },
        }),
    ).toThrow("dense data fields");
  });

  it("recursively clones and freezes ordinary dense nested arrays", () => {
    const nested = [{ values: [1, true, null] }];
    const error = new ApplicationError("SAFE_DETAILS", "Safe details", {
      details: { nested },
    });
    const cloned = error.details?.nested as readonly {
      readonly values: readonly unknown[];
    }[];

    expect(cloned).toEqual(nested);
    expect(cloned).not.toBe(nested);
    expect(cloned[0]).not.toBe(nested[0]);
    expect(cloned[0].values).not.toBe(nested[0].values);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(Object.isFrozen(cloned[0])).toBe(true);
    expect(Object.isFrozen(cloned[0].values)).toBe(true);
  });

  it.each([
    { unsafe: new Date() },
    { unsafe: () => "not serializable" },
    { unsafe: Number.NaN },
  ])("rejects unsafe structured details", (details) => {
    expect(
      () => new ApplicationError("UNSAFE_DETAILS", "Unsafe details", { details }),
    ).toThrow();
  });
});
