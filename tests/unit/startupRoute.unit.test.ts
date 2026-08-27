import { describe, expect, it } from "vitest";

import {
  selectStartupRoute,
  STARTUP_ROUTE_ENV,
} from "../../src/dungeonJockey/main/startupRoute";

describe("startup route selection", () => {
  it("defaults to the Dungeon Jockey route", () => {
    expect(selectStartupRoute(false, undefined)).toBe("dungeon-jockey");
    expect(selectStartupRoute(true, undefined)).toBe("dungeon-jockey");
  });

  it("permits the legacy route only during unpackaged development", () => {
    expect(selectStartupRoute(false, "legacy-kenku")).toBe("legacy-kenku");
    expect(() => selectStartupRoute(true, "legacy-kenku")).toThrow(
      "development-only",
    );
  });

  it("rejects invalid configured values", () => {
    expect(() => selectStartupRoute(false, "legacy")).toThrow(
      `${STARTUP_ROUTE_ENV} must be`,
    );
    expect(() => selectStartupRoute(false, "")).toThrow();
  });
});
