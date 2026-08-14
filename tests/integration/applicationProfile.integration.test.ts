import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { appMock } = vi.hoisted(() => ({
  appMock: {
    getPath: vi.fn(),
    isPackaged: true,
    setAppUserModelId: vi.fn(),
    setName: vi.fn(),
    setPath: vi.fn(),
  },
}));

vi.mock("electron", () => ({ app: appMock }));

import {
  configureApplicationProfile,
  TEST_PROFILE_ENV,
} from "../../src/applicationProfile";

afterEach(() => {
  delete process.env[TEST_PROFILE_ENV];
  vi.clearAllMocks();
});

describe("isolated application profile startup", () => {
  it("configures user and session data beneath a real temporary profile", () => {
    const runRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dungeon-jockey-profile-integration-"),
    );
    const profilePath = path.join(runRoot, "profile");

    try {
      process.env[TEST_PROFILE_ENV] = profilePath;
      const profile = configureApplicationProfile();

      expect(profile).toEqual({
        mode: "test",
        userDataPath: profilePath,
        sessionDataPath: path.join(profilePath, "Session Data"),
      });
      expect(fs.statSync(profile.sessionDataPath).isDirectory()).toBe(true);
      expect(appMock.setName).toHaveBeenCalledWith("Dungeon Jockey");
      expect(appMock.setAppUserModelId).toHaveBeenCalledWith(
        "io.github.probablyryan.dungeon-jockey",
      );
      expect(appMock.setPath).toHaveBeenCalledWith("userData", profilePath);
      expect(appMock.setPath).toHaveBeenCalledWith(
        "sessionData",
        path.join(profilePath, "Session Data"),
      );
    } finally {
      fs.rmSync(runRoot, { recursive: true, force: true });
    }

    expect(fs.existsSync(runRoot)).toBe(false);
  });
});
