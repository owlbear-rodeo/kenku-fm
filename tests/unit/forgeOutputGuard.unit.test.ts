import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(__dirname, "../..");
const {
  E2E_MARKER,
  E2E_MARKER_CONTENT,
  createDirectoryManifest,
} = require("../../scripts/temporary-path");
const {
  loadForgeConfiguration,
  runWithForgeOutputGuard,
} = require("../../scripts/forge-output-guard");

describe("packaged-smoke Forge guard", () => {
  it("blocks a mismatch before spawning and permits the exact marked run", () => {
    const testRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "dungeon-jockey-forge-guard-"),
    );
    const runRoot = path.join(testRoot, "run");
    const packageOutput = path.join(runRoot, "package-output");
    const repositoryOut = path.join(testRoot, "repository-out");
    fs.mkdirSync(packageOutput, { recursive: true });
    fs.mkdirSync(repositoryOut);
    fs.writeFileSync(path.join(runRoot, E2E_MARKER), E2E_MARKER_CONTENT);
    fs.writeFileSync(path.join(repositoryOut, "sentinel.txt"), "unchanged\n");

    try {
      const sentinel = createDirectoryManifest(repositoryOut);
      const validConfig = loadForgeConfiguration(
        repositoryRoot,
        packageOutput,
      );
      const packageCommand = vi.fn(() => "packaged");
      const options = {
        config: { ...validConfig, outDir: path.join(runRoot, "wrong-output") },
        expectedOutput: packageOutput,
        repositoryOut,
        repositoryRoot,
        runRoot,
        sentinel,
      };

      expect(() =>
        runWithForgeOutputGuard(options, packageCommand),
      ).toThrow("effective Forge outDir does not match");
      expect(packageCommand).toHaveBeenCalledTimes(0);

      expect(
        runWithForgeOutputGuard(
          { ...options, config: validConfig },
          packageCommand,
        ),
      ).toBe("packaged");
      expect(packageCommand).toHaveBeenCalledOnce();
    } finally {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });
});
