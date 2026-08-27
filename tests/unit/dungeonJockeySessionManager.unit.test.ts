import { describe, expect, it, vi } from "vitest";

import { parseDungeonJockeySessionId } from "../../src/dungeonJockey/domain/ids/ids";
import { DungeonJockeySessionManager } from "../../src/dungeonJockey/main/DungeonJockeySessionManager";
import { MainLifetimeSubsystem } from "../../src/dungeonJockey/ports/lifecycle/LifecycleSubsystems";

const SESSION_ID = parseDungeonJockeySessionId(
  "123e4567-e89b-42d3-a456-426614174000",
);

function createCompatibilitySession() {
  return {
    lifetime: "visible-renderer-compatibility" as const,
    dispose: vi.fn<() => void>(),
  };
}

describe("DungeonJockeySessionManager", () => {
  it("constructs one stable root and one compatibility session", () => {
    const compatibilitySession = createCompatibilitySession();
    const factory = vi.fn(() => compatibilitySession);
    const root = new DungeonJockeySessionManager({
      sessionId: SESSION_ID,
      mainLifetimeSubsystems: [],
      createVisibleRendererCompatibilitySession: factory,
    });

    expect(root.sessionId).toBe(SESSION_ID);
    expect(factory).toHaveBeenCalledOnce();
    expect(compatibilitySession.dispose).not.toHaveBeenCalled();
  });

  it("reloads only renderer compatibility and preserves the main lifetime", () => {
    const sessions = [
      createCompatibilitySession(),
      createCompatibilitySession(),
    ];
    const mainDispose = vi.fn<() => void>();
    const mainSubsystem: MainLifetimeSubsystem = {
      lifetime: "main",
      dispose: mainDispose,
    };
    const factory = vi.fn(() => sessions[factory.mock.calls.length - 1]);
    const root = new DungeonJockeySessionManager({
      sessionId: SESSION_ID,
      mainLifetimeSubsystems: [mainSubsystem],
      createVisibleRendererCompatibilitySession: factory,
    });

    const originalRoot = root;
    root.refreshVisibleRendererCompatibilitySession();

    expect(root).toBe(originalRoot);
    expect(root.sessionId).toBe(SESSION_ID);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(sessions[0].dispose).toHaveBeenCalledOnce();
    expect(sessions[1].dispose).not.toHaveBeenCalled();
    expect(mainDispose).not.toHaveBeenCalled();

    root.dispose();
    root.dispose();

    expect(sessions[0].dispose).toHaveBeenCalledOnce();
    expect(sessions[1].dispose).toHaveBeenCalledOnce();
    expect(mainDispose).toHaveBeenCalledOnce();
  });

  it("rejects renderer reload after idempotent final disposal", () => {
    const compatibilitySession = createCompatibilitySession();
    const root = new DungeonJockeySessionManager({
      sessionId: SESSION_ID,
      mainLifetimeSubsystems: [],
      createVisibleRendererCompatibilitySession: () => compatibilitySession,
    });

    root.dispose();
    root.dispose();

    expect(compatibilitySession.dispose).toHaveBeenCalledOnce();
    expect(() => root.refreshVisibleRendererCompatibilitySession()).toThrow(
      "has been disposed",
    );
  });
});
