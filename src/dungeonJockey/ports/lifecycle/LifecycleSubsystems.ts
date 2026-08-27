export interface MainLifetimeSubsystem {
  readonly lifetime: "main";
  dispose(): void;
}

export interface VisibleRendererCompatibilitySession {
  readonly lifetime: "visible-renderer-compatibility";
  dispose(): void;
}
