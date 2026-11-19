import { beforeEach, describe, expect, it, vi } from "vitest";

const legacySession = vi.hoisted(() => ({
  construct: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("../../src/main/managers/SessionManager", () => ({
  SessionManager: class {
    constructor(window: unknown, player: unknown) {
      legacySession.construct(window, player);
    }

    destroy() {
      legacySession.destroy();
    }
  },
}));

import { createDungeonJockeyCompositionRoot } from "../../src/dungeonJockey/main/compositionRoot";

beforeEach(() => vi.clearAllMocks());

describe("Dungeon Jockey composition root", () => {
  it("constructs and disposes the inherited session only through the Kenku adapter", () => {
    const player = {} as import("@discordjs/voice").AudioPlayer;
    const window = {} as Electron.BrowserWindow;
    const root = createDungeonJockeyCompositionRoot(
      window,
      player,
    );

    expect(root.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(legacySession.construct).toHaveBeenCalledOnce();
    root.refreshVisibleRendererCompatibilitySession();
    expect(legacySession.construct).toHaveBeenNthCalledWith(2, window, player);

    root.dispose();
    expect(legacySession.destroy).toHaveBeenCalledTimes(2);
  });
});
