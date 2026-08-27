import { beforeEach, describe, expect, it, vi } from "vitest";

const legacySession = vi.hoisted(() => ({
  construct: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("../../src/main/managers/SessionManager", () => ({
  SessionManager: class {
    constructor() {
      legacySession.construct();
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
    const root = createDungeonJockeyCompositionRoot(
      {} as Electron.BrowserWindow,
    );

    expect(root.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(legacySession.construct).toHaveBeenCalledOnce();

    root.dispose();
    expect(legacySession.destroy).toHaveBeenCalledOnce();
  });
});
