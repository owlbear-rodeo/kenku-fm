const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  E2E_MARKER,
  E2E_MARKER_CONTENT,
  createDirectoryManifest,
  isPathInside,
  resolveTemporaryChild,
} = require("./temporary-path");
const {
  assertRepositoryOutUnchanged,
  loadForgeConfiguration,
  runWithForgeOutputGuard,
} = require("./forge-output-guard");

const repositoryRoot = path.resolve(__dirname, "..");
const productIdentity = require(path.join(repositoryRoot, "product-identity.json"));
const repositoryOut = path.join(repositoryRoot, "out");
const repositoryOutSentinel = createDirectoryManifest(repositoryOut);
const runRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "dungeon-jockey-e2e-"),
);
const markerPath = path.join(runRoot, E2E_MARKER);
const packageOutput = path.join(runRoot, "package-output");
const profilePath = path.join(runRoot, "profile");

function runNode(args, extraEnvironment) {
  const environment = {
    ...process.env,
    CI: process.env.CI || "1",
    FORCE_COLOR: "0",
    ...extraEnvironment,
  };
  delete environment.NO_COLOR;

  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.replace(
    /\u001b\[[0-9;?]*[ -/]*[@-~]/g,
    "",
  );
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`child command exited ${result.status}`);
  }
}

function safeCleanup() {
  const resolvedRoot = resolveTemporaryChild(runRoot, repositoryRoot);
  if (!isPathInside(os.tmpdir(), resolvedRoot) || !fs.existsSync(markerPath)) {
    throw new Error("refusing to clean an unvalidated E2E run directory");
  }
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
}

try {
  fs.writeFileSync(markerPath, E2E_MARKER_CONTENT, {
    encoding: "utf8",
    flag: "wx",
  });
  fs.mkdirSync(packageOutput);
  resolveTemporaryChild(packageOutput, repositoryRoot);
  resolveTemporaryChild(profilePath, repositoryRoot);

  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("Packaged browser-audio smoke requires Windows x64.");
  }

  const yarnCli = process.env.npm_execpath;
  if (!yarnCli || path.basename(yarnCli).toLowerCase() !== "yarn.js") {
    throw new Error("test:e2e must be invoked through Yarn Classic");
  }

  const effectiveForgeConfig = loadForgeConfiguration(
    repositoryRoot,
    packageOutput,
  );
  runWithForgeOutputGuard(
    {
      config: effectiveForgeConfig,
      expectedOutput: packageOutput,
      repositoryOut,
      repositoryRoot,
      runRoot,
      sentinel: repositoryOutSentinel,
    },
    () =>
      runNode(
        [yarnCli, "package", "--platform=win32", "--arch=x64"],
        { DUNGEON_JOCKEY_FORGE_OUT: packageOutput },
      ),
  );
  assertRepositoryOutUnchanged(
    repositoryOut,
    repositoryOutSentinel,
    "after packaging",
  );

  const packageDirectories = fs
    .readdirSync(packageOutput, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packageOutput, entry.name));
  if (packageDirectories.length !== 1) {
    throw new Error(
      `expected one Forge package directory, found ${packageDirectories.length}`,
    );
  }
  const packageDirectory = packageDirectories[0];
  const packagedMetadataPath = path.join(
    packageDirectory,
    "resources",
    "app",
    "package.json",
  );
  const packagedMetadata = JSON.parse(
    fs.readFileSync(packagedMetadataPath, "utf8"),
  );
  if (
    packagedMetadata.name !== productIdentity.packageName ||
    packagedMetadata.productName !== productIdentity.displayName
  ) {
    throw new Error("packaged application identity does not match product metadata");
  }

  const playwrightPackage = require.resolve("@playwright/test/package.json");
  const playwrightCli = path.join(path.dirname(playwrightPackage), "cli.js");
  runNode([playwrightCli, "test", "--config=playwright.config.ts"], {
    DUNGEON_JOCKEY_E2E_OUTPUT: packageOutput,
    DUNGEON_JOCKEY_E2E_PACKAGE: packageDirectory,
    DUNGEON_JOCKEY_E2E_PROFILE: profilePath,
    DUNGEON_JOCKEY_E2E_RUN_ROOT: runRoot,
  });
  assertRepositoryOutUnchanged(
    repositoryOut,
    repositoryOutSentinel,
    "after Playwright",
  );
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  try {
    safeCleanup();
    console.log(`Packaged smoke cleanup verified: ${runRoot}`);
    assertRepositoryOutUnchanged(
      repositoryOut,
      repositoryOutSentinel,
      "after cleanup",
    );
  } catch (cleanupError) {
    console.error(
      cleanupError instanceof Error ? cleanupError.stack : cleanupError,
    );
    process.exitCode = 1;
  }
}
