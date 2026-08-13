import fs from "fs";
import os from "os";
import path from "path";
import { app } from "electron";

import productIdentity from "../product-identity.json";

export const TEST_PROFILE_ENV = "DUNGEON_JOCKEY_TEST_PROFILE";

export type ApplicationProfileMode = "production" | "development" | "test";

export type ApplicationProfile = {
  mode: ApplicationProfileMode;
  userDataPath: string;
  sessionDataPath: string;
};

function resolveTestProfile(testProfile: string): string {
  if (!path.isAbsolute(testProfile)) {
    throw new Error(`${TEST_PROFILE_ENV} must be an absolute path`);
  }

  const temporaryRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(testProfile);
  const relativeProfile = path.relative(temporaryRoot, resolvedProfile);

  if (
    relativeProfile === "" ||
    relativeProfile === ".." ||
    relativeProfile.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeProfile)
  ) {
    throw new Error(`${TEST_PROFILE_ENV} must be a child of ${temporaryRoot}`);
  }

  return resolvedProfile;
}

export function configureApplicationProfile(): ApplicationProfile {
  const testProfile = process.env[TEST_PROFILE_ENV];
  let mode: ApplicationProfileMode;
  let userDataPath: string;

  if (testProfile !== undefined) {
    mode = "test";
    userDataPath = resolveTestProfile(testProfile);
  } else if (app.isPackaged) {
    mode = "production";
    userDataPath = path.join(
      app.getPath("appData"),
      productIdentity.productionUserDataName,
    );
  } else {
    mode = "development";
    userDataPath = path.join(
      app.getPath("appData"),
      productIdentity.developmentUserDataName,
    );
  }

  const sessionDataPath = path.join(userDataPath, "Session Data");
  fs.mkdirSync(sessionDataPath, { recursive: true });

  app.setName(productIdentity.displayName);
  app.setAppUserModelId(productIdentity.applicationId);
  app.setPath("userData", userDataPath);
  app.setPath("sessionData", sessionDataPath);

  return { mode, userDataPath, sessionDataPath };
}
