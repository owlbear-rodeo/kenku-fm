import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  createDirectoryManifest,
  resolveTemporaryChild,
}: {
  createDirectoryManifest: (root: string) => {
    byteTotal: number;
    directoryCount: number;
    entries: string[];
    exists: boolean;
    fileCount: number;
  };
  resolveTemporaryChild: (candidate: string, repositoryRoot?: string) => string;
} = require("../../scripts/temporary-path");

describe("temporary output validation", () => {
  it("represents an absent repository output without creating it", () => {
    const missing = path.join(
      os.tmpdir(),
      `dungeon-jockey-missing-${process.pid}-${Date.now()}`,
    );

    expect(createDirectoryManifest(missing)).toMatchObject({
      byteTotal: 0,
      directoryCount: 0,
      entries: [],
      exists: false,
      fileCount: 0,
    });
    expect(fs.existsSync(missing)).toBe(false);
  });

  it("accepts an absolute child below the OS temporary directory", () => {
    const candidate = path.join(os.tmpdir(), "dungeon-jockey-e2e-id", "package");
    expect(resolveTemporaryChild(candidate)).toBe(path.resolve(candidate));
  });

  it("rejects relative paths and the temporary root itself", () => {
    expect(() => resolveTemporaryChild("relative-output")).toThrow(
      "must be absolute",
    );
    expect(() => resolveTemporaryChild(os.tmpdir())).toThrow("must be a child");
  });

  it("rejects a repository path even if the repository is under temp", () => {
    const repositoryRoot = path.join(os.tmpdir(), "repository");
    expect(() =>
      resolveTemporaryChild(path.join(repositoryRoot, "out"), repositoryRoot),
    ).toThrow("must not be inside the repository");
  });
});
