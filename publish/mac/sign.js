import { sign } from "@electron/osx-sign";
import path from "node:path";
import { exit } from "node:process";

function signApp(identityName, identityId) {
  const __dirname = import.meta.dirname;
  const srcDir = path.resolve(__dirname, "..", "..");
  sign({
    app: path.join(
      srcDir,
      "out",
      `Kenku FM-darwin-${process.arch}`,
      "Kenku FM.app"
    ),
    identity: `Developer ID Application: ${identityName} (${identityId})`,
    platform: "darwin",
    "gatekeeper-assess": false,
    optionsForFile: () => ({
      hardenedRuntime: true,
      entitlements: path.resolve(srcDir, "entitlements.plist"),
    }),
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
const identityName = args[0];
const identityId = args[1];

if (identityName === undefined) {
  console.log("Apple identity name is undefined");
  exit(1);
}

if (identityId === undefined) {
  console.log("Apple identity ID is undefined");
  exit(1);
}

signApp(identityName, identityId);
