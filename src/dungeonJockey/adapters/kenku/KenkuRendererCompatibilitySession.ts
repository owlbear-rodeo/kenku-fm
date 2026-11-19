import type { BrowserWindow } from "electron";
import type { AudioPlayer } from "@discordjs/voice";

import { VisibleRendererCompatibilitySession } from "../../ports/lifecycle/LifecycleSubsystems";
import { SessionManager } from "../../../main/managers/SessionManager";

/**
 * Transitional renderer-bound access to the inherited Kenku session.
 * Product behavior must move to owned ports instead of expanding this adapter.
 */
export class KenkuRendererCompatibilitySession
  implements VisibleRendererCompatibilitySession
{
  readonly lifetime = "visible-renderer-compatibility" as const;
  private session: SessionManager | null;

  constructor(window: BrowserWindow, audioPlayer: AudioPlayer) {
    this.session = new SessionManager(window, audioPlayer);
  }

  dispose(): void {
    const session = this.session;
    this.session = null;
    session?.destroy();
  }
}
