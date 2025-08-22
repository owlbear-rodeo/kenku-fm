import { sign } from "@electron/osx-sign";
import path from "node:path";
import { exit } from "node:process";

function signApp(appDir, identityName, identityId, entitlementsFile) {
  sign({
    app: path.resolve(
      appDir,
      "out",
      `Kenku FM-darwin-${process.arch}`,
      "Kenku FM.app"
    ),
    identity: `Developer ID Application: ${identityName} (${identityId})`,
    platform: "darwin",
    "gatekeeper-assess": false,
    optionsForFile: {
      hardenedRuntime: true,
      entitlements: path.resolve(entitlementsFile),
    },
  })
    .then(() => {
      console.log("Successfully signed application");
    })
    .catch((e) => {
      console.log(`Error occured: ${e.message}`);
      exit(1);
    });
}

const args = process.argv.slice(2);
const appDir = path.resolve(args[0]);
const identityName = args[1];
const identityId = args[2];
const entitlementsFile = args[3];

if (appDir === undefined) {
  console.log("appDir is undefined");
  exit(1);
}

if (identityName === undefined) {
  console.log("Apple identity name is undefined");
  exit(1);
}

if (identityId === undefined) {
  console.log("Apple identity ID is undefined");
  exit(1);
}

if (entitlementsFile === undefined) {
  console.log("Entitlements is undefined");
  exit(1);
}

signApp(appDir, identityName, identityId, entitlementsFile);
