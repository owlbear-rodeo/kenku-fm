import type { BrowserWindow } from "electron";
import type { AudioPlayer } from "@discordjs/voice";

import { KenkuRendererCompatibilitySession } from "../adapters/kenku/KenkuRendererCompatibilitySession";
import { nodeUuidFactory } from "../adapters/node/nodeUuidFactory";
import { createDungeonJockeySessionId } from "../domain/ids/ids";
import { DungeonJockeySessionManager } from "./DungeonJockeySessionManager";

export function createDungeonJockeyCompositionRoot(
  window: BrowserWindow,
  audioPlayer: AudioPlayer,
): DungeonJockeySessionManager {
  return new DungeonJockeySessionManager({
    sessionId: createDungeonJockeySessionId(nodeUuidFactory),
    mainLifetimeSubsystems: [],
    createVisibleRendererCompatibilitySession: () =>
      new KenkuRendererCompatibilitySession(window, audioPlayer),
  });
}
