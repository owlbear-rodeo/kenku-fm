import os from "os";
import path from "path";

import { TEST_PROFILE_ENV } from "../../applicationProfile";

export const AUDIO_SMOKE_PROBE_ENV = "DUNGEON_JOCKEY_AUDIO_SMOKE_PROBE";
export const AUDIO_SMOKE_PROBE_VALUE = "main-pcm-v1";
export const AUDIO_SMOKE_PROBE_GLOBAL =
  "__DUNGEON_JOCKEY_AUDIO_SMOKE_PROBE__";

export type AudioCaptureSmokeFacts = {
  pcmFrameCount: number;
  peakAbsoluteSample: number;
};

type AudioCaptureSmokeSurface = {
  read: () => AudioCaptureSmokeFacts;
  reset: () => void;
};

export type AudioCaptureSmokeProbe = {
  observe: (pcm: Buffer) => void;
  dispose: () => void;
};

type SmokeProbeGlobal = typeof globalThis & {
  [AUDIO_SMOKE_PROBE_GLOBAL]?: AudioCaptureSmokeSurface;
};

function hasIsolatedTestProfile(): boolean {
  const testProfile = process.env[TEST_PROFILE_ENV];
  if (!testProfile || !path.isAbsolute(testProfile)) {
    return false;
  }

  const temporaryRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(testProfile);
  const relativeProfile = path.relative(temporaryRoot, resolvedProfile);

  return (
    relativeProfile !== "" &&
    relativeProfile !== ".." &&
    !relativeProfile.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeProfile)
  );
}

function isEnabled(): boolean {
  return (
    process.env[AUDIO_SMOKE_PROBE_ENV] === AUDIO_SMOKE_PROBE_VALUE &&
    hasIsolatedTestProfile()
  );
}

export function createAudioCaptureSmokeProbe():
  | AudioCaptureSmokeProbe
  | undefined {
  if (!isEnabled()) {
    return undefined;
  }

  let pcmFrameCount = 0;
  let peakAbsoluteSample = 0;

  const surface: AudioCaptureSmokeSurface = Object.freeze({
    read: () => ({ pcmFrameCount, peakAbsoluteSample }),
    reset: () => {
      pcmFrameCount = 0;
      peakAbsoluteSample = 0;
    },
  });

  const smokeGlobal = globalThis as SmokeProbeGlobal;
  if (smokeGlobal[AUDIO_SMOKE_PROBE_GLOBAL]) {
    throw new Error("Audio smoke probe is already installed");
  }

  Object.defineProperty(smokeGlobal, AUDIO_SMOKE_PROBE_GLOBAL, {
    configurable: true,
    enumerable: false,
    value: surface,
  });

  return {
    observe: (pcm: Buffer) => {
      pcmFrameCount += 1;
      for (let offset = 0; offset + 1 < pcm.length; offset += 2) {
        const sample = pcm.readInt16LE(offset);
        const absoluteSample = Math.abs(sample);
        if (absoluteSample > peakAbsoluteSample) {
          peakAbsoluteSample = absoluteSample;
        }
      }
    },
    dispose: () => {
      if (smokeGlobal[AUDIO_SMOKE_PROBE_GLOBAL] === surface) {
        delete smokeGlobal[AUDIO_SMOKE_PROBE_GLOBAL];
      }
    },
  };
}
