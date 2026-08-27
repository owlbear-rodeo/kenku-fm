import type { BrowserWindow } from "electron";

import { KenkuRendererCompatibilitySession } from "../adapters/kenku/KenkuRendererCompatibilitySession";
import { nodeUuidFactory } from "../adapters/node/nodeUuidFactory";
import { createDungeonJockeySessionId } from "../domain/ids/ids";
import { DungeonJockeySessionManager } from "./DungeonJockeySessionManager";

export function createDungeonJockeyCompositionRoot(
  window: BrowserWindow,
): DungeonJockeySessionManager {
  return new DungeonJockeySessionManager({
    sessionId: createDungeonJockeySessionId(nodeUuidFactory),
    mainLifetimeSubsystems: [],
    createVisibleRendererCompatibilitySession: () =>
      new KenkuRendererCompatibilitySession(window),
  });
}
