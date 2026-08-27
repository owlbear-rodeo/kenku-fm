export const STARTUP_ROUTE_ENV = "DUNGEON_JOCKEY_STARTUP_ROUTE";

export type StartupRoute = "dungeon-jockey" | "legacy-kenku";

export function selectStartupRoute(
  isPackaged: boolean,
  configuredRoute: string | undefined = process.env[STARTUP_ROUTE_ENV],
): StartupRoute {
  if (configuredRoute === undefined || configuredRoute === "dungeon-jockey") {
    return "dungeon-jockey";
  }

  if (configuredRoute === "legacy-kenku") {
    if (isPackaged) {
      throw new Error("The legacy Kenku startup route is development-only");
    }
    return "legacy-kenku";
  }

  throw new Error(
    `${STARTUP_ROUTE_ENV} must be "dungeon-jockey" or "legacy-kenku"`,
  );
}
