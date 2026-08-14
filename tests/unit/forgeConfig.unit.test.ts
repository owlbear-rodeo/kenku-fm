import os from "os";
import path from "path";
import { createRequire } from "module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(__dirname, "../..");
const configPath = require.resolve("../../forge.config.js");

function loadConfig(override?: string) {
  const previousOverride = process.env.DUNGEON_JOCKEY_FORGE_OUT;
  try {
    if (override === undefined) {
      delete process.env.DUNGEON_JOCKEY_FORGE_OUT;
    } else {
      process.env.DUNGEON_JOCKEY_FORGE_OUT = override;
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

afterEach(() => delete require.cache[configPath]);

describe("Forge output configuration", () => {
  it("keeps ordinary packaging at the Forge default repository output", () => {
    const config = loadConfig();
    expect(config.outDir).toBe("./out");
    expect(Object.prototype.hasOwnProperty.call(config.packagerConfig, "out")).toBe(
      false,
    );
  });

  it("uses the exact validated absolute temporary override", () => {
    const output = path.join(os.tmpdir(), "dungeon-jockey-forge-test", "out");
    const config = loadConfig(output);
    expect(config.outDir).toBe(path.resolve(output));
    expect(Object.prototype.hasOwnProperty.call(config.packagerConfig, "out")).toBe(
      false,
    );
  });

  it.each([
    ["relative", "relative-output"],
    ["temporary root", os.tmpdir()],
    ["workspace", path.join(repositoryRoot, "out")],
    ["traversal-like", path.join(os.tmpdir(), "child", "..")],
  ])("rejects an invalid %s override", (_, output) => {
    expect(() => loadConfig(output)).toThrow();
  });
});
