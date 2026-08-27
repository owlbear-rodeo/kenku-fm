import { DungeonJockeySessionId } from "../domain/ids/ids";
import {
  MainLifetimeSubsystem,
  VisibleRendererCompatibilitySession,
} from "../ports/lifecycle/LifecycleSubsystems";

export type VisibleRendererCompatibilitySessionFactory =
  () => VisibleRendererCompatibilitySession;

export type DungeonJockeySessionDependencies = Readonly<{
  sessionId: DungeonJockeySessionId;
  mainLifetimeSubsystems: readonly MainLifetimeSubsystem[];
  createVisibleRendererCompatibilitySession: VisibleRendererCompatibilitySessionFactory;
}>;

export class DungeonJockeySessionManager {
  readonly sessionId: DungeonJockeySessionId;
  private readonly mainLifetimeSubsystems: readonly MainLifetimeSubsystem[];
  private readonly createVisibleRendererCompatibilitySession: VisibleRendererCompatibilitySessionFactory;
  private visibleRendererCompatibilitySession: VisibleRendererCompatibilitySession | null;
  private disposed = false;

  constructor(dependencies: DungeonJockeySessionDependencies) {
    this.sessionId = dependencies.sessionId;
    this.mainLifetimeSubsystems = [...dependencies.mainLifetimeSubsystems];
    this.createVisibleRendererCompatibilitySession =
      dependencies.createVisibleRendererCompatibilitySession;
    this.visibleRendererCompatibilitySession =
      this.createVisibleRendererCompatibilitySession();
  }

  refreshVisibleRendererCompatibilitySession(): void {
    if (this.disposed) {
      throw new Error("Dungeon Jockey session has been disposed");
    }

    const previousSession = this.visibleRendererCompatibilitySession;
    this.visibleRendererCompatibilitySession = null;
    previousSession?.dispose();
    this.visibleRendererCompatibilitySession =
      this.createVisibleRendererCompatibilitySession();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    const disposalErrors: unknown[] = [];
    const compatibilitySession = this.visibleRendererCompatibilitySession;
    this.visibleRendererCompatibilitySession = null;
    try {
      compatibilitySession?.dispose();
    } catch (error) {
      disposalErrors.push(error);
    }

    for (
      let index = this.mainLifetimeSubsystems.length - 1;
      index >= 0;
      index -= 1
    ) {
      try {
        this.mainLifetimeSubsystems[index].dispose();
      } catch (error) {
        disposalErrors.push(error);
      }
    }

    if (disposalErrors.length > 0) {
      const firstError = disposalErrors[0];
      if (firstError instanceof Error) {
        throw firstError;
      }
      throw new Error("A Dungeon Jockey subsystem failed to dispose");
    }
  }
}
