const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];
const expectedIdentity = {
  displayName: "Dungeon Jockey",
  descriptor: "Tabletop Audio for Game Masters",
  packageName: "dungeon-jockey",
  applicationId: "io.github.probablyryan.dungeon-jockey",
  productionUserDataName: "Dungeon Jockey",
  developmentUserDataName: "Dungeon Jockey Development",
};

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireAbsent(relativePath, description) {
  if (fs.existsSync(path.join(root, relativePath))) {
    fail(`${description} returned at ${relativePath}`);
  }
}

function collectFiles(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];
  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) =>
    collectFiles(path.join(relativePath, entry.name)),
  );
}

const identity = JSON.parse(read("product-identity.json"));
if (JSON.stringify(identity) !== JSON.stringify(expectedIdentity)) {
  fail("product-identity.json drifted from the accepted Phase 0 identity");
}

const packageJson = JSON.parse(read("package.json"));
if (packageJson.name !== identity.packageName) fail("package name drifted");
if (packageJson.productName !== identity.displayName) fail("product name drifted");
if (packageJson.description !== identity.descriptor) fail("descriptor drifted");
if (packageJson.scripts && packageJson.scripts.publish) fail("publish script returned");
if (packageJson.devDependencies?.["@electron-forge/publisher-github"]) {
  fail("Forge GitHub publisher dependency returned");
}
const expectedElectron =
  "https://github.com/castlabs/electron-releases#v43.0.0+wvcus";
const forgeConfig = require(path.join(root, "forge.config.js"));
if (
  packageJson.devDependencies?.electron !== expectedElectron ||
  forgeConfig.rebuildConfig?.forceABI !== 148
) {
  fail(
    "CastLabs Electron v43.0.0+wvcus and Forge ABI 148 must remain pinned and be reviewed together",
  );
}
if (packageJson.dependencies?.["zlib-sync"]) {
  fail("optional zlib-sync root dependency returned");
}
const forgeExternals = forgeConfig.plugins?.find(
  (plugin) => plugin.name === "@timfish/forge-externals-plugin",
)?.config?.externals;
if (forgeExternals?.includes("zlib-sync")) {
  fail("optional zlib-sync Forge external returned");
}
if (forgeConfig.packagerConfig.executableName !== identity.packageName) {
  fail("Forge executable name drifted");
}
if (forgeConfig.packagerConfig.appBundleId !== identity.applicationId) {
  fail("Forge application ID drifted");
}
if (
  forgeConfig.packagerConfig.win32metadata?.ProductName !== identity.displayName
) {
  fail("Windows product metadata drifted");
}
if (forgeConfig.publishers?.length) fail("a Forge publisher returned");

[
  ["src/autoUpdate.ts", "application updater"],
  [".github/workflows/publish-stable.yaml", "inherited publish workflow"],
  ["publish", "tracked publish helper tree"],
].forEach(([relativePath, description]) =>
  requireAbsent(relativePath, description),
);

const prohibitedActiveText = [
  "download.kenku.fm",
  "owlbear-rodeo/kenku-fm-assets",
  "KENKU_ASSET_REPO_TOKEN",
  "owlbear-rodeo/kenku-fm",
  "@electron-forge/publisher-github",
  "electron-forge publish",
  "autoUpdater",
];
const activeFiles = [
  "package.json",
  "forge.config.js",
  ".github",
  "src",
].flatMap(collectFiles);
for (const absolutePath of activeFiles) {
  const text = fs.readFileSync(absolutePath, "utf8");
  for (const prohibited of prohibitedActiveText) {
    if (text.includes(prohibited)) {
      fail(`${prohibited} returned in ${path.relative(root, absolutePath)}`);
    }
  }
}

const mainSource = read("src/index.ts");
if (!mainSource.includes("await components.whenReady()")) {
  fail("CastLabs component readiness startup disappeared");
}
if (
  mainSource.indexOf("configureApplicationProfile()") >
  mainSource.indexOf("requestSingleInstanceLock()")
) {
  fail("application profile configuration must precede the single-instance lock");
}

const profileSource = read("src/applicationProfile.ts");
for (const required of [
  "DUNGEON_JOCKEY_TEST_PROFILE",
  "productionUserDataName",
  "developmentUserDataName",
  "path.isAbsolute(testProfile)",
  "path.relative(temporaryRoot, resolvedProfile)",
  'app.setPath("userData"',
  'app.setPath("sessionData"',
]) {
  if (!profileSource.includes(required)) {
    fail(`profile boundary is missing ${required}`);
  }
}

const boundsSource = read("src/bounds.ts");
if (/const\s+store\s*=\s*new Store/.test(boundsSource)) {
  fail("electron-store returned to eager top-level construction");
}

const removedBrandAssets = [
  "src/assets/dmg-background.png",
  "src/assets/icon.icns",
  "src/assets/icon.ico",
  "src/assets/icon.png",
  "src/assets/icon.svg",
  "src/assets/icons",
  "src/assets/loading.gif",
  "src/assets/player-icon.png",
  "src/assets/setup.icns",
  "src/assets/setup.ico",
];
for (const asset of removedBrandAssets) {
  requireAbsent(asset, "removed Kenku brand asset");
}

const mirror = read(".env").trim();
if (
  mirror !==
  "ELECTRON_MIRROR=https://github.com/castlabs/electron-releases/releases/download/"
) {
  fail("the required CastLabs Electron mirror changed");
}

if (failures.length) {
  console.error("Phase 0 boundary verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "Phase 0 identity, isolation, detachment, and CastLabs boundaries verified.",
);
