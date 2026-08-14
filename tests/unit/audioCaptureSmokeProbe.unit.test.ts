import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { TEST_PROFILE_ENV } from "../../src/applicationProfile";
import {
  AUDIO_SMOKE_PROBE_ENV,
  AUDIO_SMOKE_PROBE_GLOBAL,
  AUDIO_SMOKE_PROBE_VALUE,
  createAudioCaptureSmokeProbe,
} from "../../src/main/testSupport/audioCaptureSmokeProbe";

type ProbeSurface = {
  read: () => { pcmFrameCount: number; peakAbsoluteSample: number };
  reset: () => void;
};

function installedSurface(): ProbeSurface | undefined {
  return (globalThis as unknown as Record<string, ProbeSurface | undefined>)[
    AUDIO_SMOKE_PROBE_GLOBAL
  ];
}

afterEach(() => {
  delete process.env[TEST_PROFILE_ENV];
  delete process.env[AUDIO_SMOKE_PROBE_ENV];
  delete (globalThis as unknown as Record<string, unknown>)[
    AUDIO_SMOKE_PROBE_GLOBAL
  ];
});

describe("audio capture smoke probe", () => {
  it("stays disabled unless both exact smoke gates are present", () => {
    process.env[TEST_PROFILE_ENV] = path.join(os.tmpdir(), "probe-profile");
    process.env[AUDIO_SMOKE_PROBE_ENV] = "not-the-explicit-value";

    expect(createAudioCaptureSmokeProbe()).toBeUndefined();
    expect(installedSurface()).toBeUndefined();
  });

  it("records numeric PCM facts and resets without retaining audio", () => {
    const runRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dungeon-jockey-probe-unit-"),
    );

    try {
      process.env[TEST_PROFILE_ENV] = path.join(runRoot, "profile");
      process.env[AUDIO_SMOKE_PROBE_ENV] = AUDIO_SMOKE_PROBE_VALUE;

      const probe = createAudioCaptureSmokeProbe();
      const surface = installedSurface();
      expect(probe).toBeDefined();
      expect(surface).toBeDefined();
      expect(Object.keys(surface).sort()).toEqual(["read", "reset"]);
      expect(surface.read()).toEqual({
        pcmFrameCount: 0,
        peakAbsoluteSample: 0,
      });

      const pcm = Buffer.alloc(6);
      pcm.writeInt16LE(0, 0);
      pcm.writeInt16LE(-1234, 2);
      pcm.writeInt16LE(32767, 4);
      probe.observe(pcm);

      expect(surface.read()).toEqual({
        pcmFrameCount: 1,
        peakAbsoluteSample: 32767,
      });
      surface.reset();
      expect(surface.read()).toEqual({
        pcmFrameCount: 0,
        peakAbsoluteSample: 0,
      });

      probe.dispose();
      expect(installedSurface()).toBeUndefined();
    } finally {
      fs.rmSync(runRoot, { recursive: true, force: true });
    }
  });
});
