import { describe, expect, it } from "vitest";

import settingsReducer, {
  setStreamingMode,
} from "../../src/renderer/features/settings/settingsSlice";

describe("settings reducer", () => {
  it("defaults to buffered performance capture and accepts low-latency mode", () => {
    const initial = settingsReducer(undefined, { type: "test/initialize" });
    expect(initial.streamingMode).toBe("performance");

    const updated = settingsReducer(initial, setStreamingMode("lowLatency"));
    expect(updated.streamingMode).toBe("lowLatency");
    expect(updated === initial).toBe(false);
  });
});
