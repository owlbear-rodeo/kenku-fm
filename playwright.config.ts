import { defineConfig } from "@playwright/test";
import path from "path";

const runRoot = process.env.DUNGEON_JOCKEY_E2E_RUN_ROOT;
if (!runRoot) throw new Error("DUNGEON_JOCKEY_E2E_RUN_ROOT is required");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: path.join(runRoot, "playwright-artifacts"),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  timeout: 90_000,
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
