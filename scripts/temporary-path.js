const os = require("os");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const E2E_MARKER = ".dungeon-jockey-e2e-run";
const E2E_MARKER_CONTENT = "created-by-packaged-smoke\n";

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function resolveTemporaryChild(candidate, repositoryRoot) {
  if (!path.isAbsolute(candidate)) {
    throw new Error("temporary output path must be absolute");
  }

  const resolved = path.resolve(candidate);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (!isPathInside(temporaryRoot, resolved)) {
    throw new Error(`temporary output path must be a child of ${temporaryRoot}`);
  }
  if (
    repositoryRoot &&
    (resolved === path.resolve(repositoryRoot) ||
      isPathInside(path.resolve(repositoryRoot), resolved))
  ) {
    throw new Error("temporary output path must not be inside the repository");
  }

  return resolved;
}

function createDirectoryManifest(root) {
  const resolvedRoot = path.resolve(root);
  const entries = [];

  if (!fs.existsSync(resolvedRoot)) {
    return {
      aggregateHash: crypto.createHash("sha256").update("absent").digest("hex"),
      byteTotal: 0,
      directoryCount: 0,
      entries,
      exists: false,
      fileCount: 0,
    };
  }
  if (!fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`manifest root is not a directory: ${resolvedRoot}`);
  }

  function visit(directory) {
    for (const name of fs.readdirSync(directory)) {
      const absolutePath = path.join(directory, name);
      const relativePath = path
        .relative(resolvedRoot, absolutePath)
        .split(path.sep)
        .join("/");
      const stat = fs.lstatSync(absolutePath);

      if (stat.isDirectory()) {
        entries.push(`directory\t${relativePath}\t0\t-`);
        visit(absolutePath);
      } else if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(absolutePath);
        const hash = crypto.createHash("sha256").update(target).digest("hex");
        entries.push(`symlink\t${relativePath}\t${stat.size}\t${hash}`);
      } else {
        const hash = crypto
          .createHash("sha256")
          .update(fs.readFileSync(absolutePath))
          .digest("hex");
        entries.push(`file\t${relativePath}\t${stat.size}\t${hash}`);
      }
    }
  }

  visit(resolvedRoot);
  entries.sort();

  return {
    aggregateHash: crypto
      .createHash("sha256")
      .update(entries.join("\n"))
      .digest("hex"),
    byteTotal: entries.reduce((total, entry) => {
      const [type, , size] = entry.split("\t");
      return type === "file" ? total + Number(size) : total;
    }, 0),
    directoryCount: entries.filter((entry) => entry.startsWith("directory\t"))
      .length,
    entries,
    exists: true,
    fileCount: entries.filter((entry) => entry.startsWith("file\t")).length,
  };
}

module.exports = {
  E2E_MARKER,
  E2E_MARKER_CONTENT,
  createDirectoryManifest,
  isPathInside,
  resolveTemporaryChild,
};
