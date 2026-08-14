const fs = require("fs");
const path = require("path");

const {
  E2E_MARKER,
  E2E_MARKER_CONTENT,
  createDirectoryManifest,
  isPathInside,
  resolveTemporaryChild,
} = require("./temporary-path");

function loadForgeConfiguration(repositoryRoot, outputOverride) {
  const configPath = require.resolve(path.join(repositoryRoot, "forge.config.js"));
  const previousOverride = process.env.DUNGEON_JOCKEY_FORGE_OUT;

  try {
    if (outputOverride === undefined) {
      delete process.env.DUNGEON_JOCKEY_FORGE_OUT;
    } else {
      process.env.DUNGEON_JOCKEY_FORGE_OUT = outputOverride;
    }
    delete require.cache[configPath];
    return require(configPath);
  } finally {
    delete require.cache[configPath];
    if (previousOverride === undefined) {
      delete process.env.DUNGEON_JOCKEY_FORGE_OUT;
    } else {
      process.env.DUNGEON_JOCKEY_FORGE_OUT = previousOverride;
    }
  }
}

function assertRepositoryOutUnchanged(repositoryOut, expectedManifest, stage) {
  const actualManifest = createDirectoryManifest(repositoryOut);
  if (
    actualManifest.exists !== expectedManifest.exists ||
    actualManifest.aggregateHash !== expectedManifest.aggregateHash ||
    actualManifest.entries.length !== expectedManifest.entries.length ||
    actualManifest.entries.some(
      (entry, index) => entry !== expectedManifest.entries[index],
    ) ||
    actualManifest.byteTotal !== expectedManifest.byteTotal
  ) {
    throw new Error(`repository out sentinel changed ${stage}`);
  }
  console.log(
    `Repository out sentinel unchanged ${stage}: ${actualManifest.aggregateHash}`,
  );
}

function assertForgeOutputConfiguration({
  config,
  expectedOutput,
  repositoryOut,
  repositoryRoot,
  runRoot,
  sentinel,
}) {
  const resolvedOutput = resolveTemporaryChild(expectedOutput, repositoryRoot);
  const resolvedRunRoot = resolveTemporaryChild(runRoot, repositoryRoot);
  const markerPath = path.join(resolvedRunRoot, E2E_MARKER);

  if (!isPathInside(resolvedRunRoot, resolvedOutput)) {
    throw new Error("Forge output must be a child of the current E2E run root");
  }
  if (!fs.statSync(resolvedOutput).isDirectory()) {
    throw new Error("Forge output target must be created before packaging");
  }
  if (fs.readFileSync(markerPath, "utf8") !== E2E_MARKER_CONTENT) {
    throw new Error("current E2E run marker is missing or invalid");
  }
  if (path.resolve(config.outDir) !== resolvedOutput) {
    throw new Error("effective Forge outDir does not match the current run");
  }
  if (Object.prototype.hasOwnProperty.call(config.packagerConfig, "out")) {
    throw new Error("packagerConfig.out must be absent");
  }

  assertRepositoryOutUnchanged(repositoryOut, sentinel, "before packaging");
}

function runWithForgeOutputGuard(options, packageCommand) {
  assertForgeOutputConfiguration(options);
  return packageCommand();
}

module.exports = {
  assertForgeOutputConfiguration,
  assertRepositoryOutUnchanged,
  loadForgeConfiguration,
  runWithForgeOutputGuard,
};
