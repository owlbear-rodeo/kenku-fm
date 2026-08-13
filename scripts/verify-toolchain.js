const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

function fail(message) {
  console.error(`Toolchain check failed: ${message}`);
  process.exit(1);
}

const requiredNode = packageJson.engines?.node;
const requiredYarn = packageJson.engines?.yarn;
const packageManager = /^yarn@(.+)$/.exec(packageJson.packageManager || "");
const versionFile = fs
  .readFileSync(path.join(root, ".node-version"), "utf8")
  .trim();

if (!requiredNode || !requiredYarn || !packageManager) {
  fail("package.json must declare exact Node and Yarn Classic versions");
}
if (packageManager[1] !== requiredYarn || versionFile !== requiredNode) {
  fail("package.json and .node-version toolchain requirements are inconsistent");
}

const useTestSeam = process.env.TOOLCHAIN_CHECK_TEST === "1";
const runningNode = useTestSeam
  ? process.env.TOOLCHAIN_CHECK_NODE_VERSION || process.versions.node
  : process.versions.node;

if (runningNode !== requiredNode) {
  fail(
    `Node ${requiredNode} is required (found ${runningNode}). Use .node-version with fnm or a compatible version manager.`,
  );
}

const lifecycle = process.env.npm_lifecycle_event;
const userAgent = useTestSeam
  ? process.env.TOOLCHAIN_CHECK_USER_AGENT || ""
  : process.env.npm_config_user_agent || "";

if (lifecycle && !userAgent) {
  fail(
    `Yarn Classic ${requiredYarn} is required; package-manager identity is missing. Run the command with Yarn.`,
  );
}

if (userAgent) {
  const manager = /^([^/\s]+)\/([^\s]+)/.exec(userAgent);
  if (!manager || manager[1] !== "yarn") {
    const found = manager ? manager[1] : "an unknown package manager";
    fail(
      `Yarn Classic ${requiredYarn} is required (found ${found}). Run yarn install --frozen-lockfile.`,
    );
  }
  if (manager[2] !== requiredYarn) {
    fail(
      `Yarn Classic ${requiredYarn} is required (found Yarn ${manager[2]}). Activate the required Yarn version and try again.`,
    );
  }
}

console.log(
  userAgent
    ? `Toolchain verified: Node ${requiredNode} and Yarn Classic ${requiredYarn}.`
    : `Node ${requiredNode} verified; run this check through Yarn to verify Yarn Classic ${requiredYarn}.`,
);
