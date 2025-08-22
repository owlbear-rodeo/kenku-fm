import { exit } from "node:process";
import path from "node:path";
import { createDMG } from "electron-installer-dmg";

function make(appDir, makeDir, appName, background, icon) {

  const outPath = path.resolve(makeDir, `${appName}.dmg`);

  const dmgConfig = {
    overwrite: true,
    name: appName,
    background,
    icon,
    appPath: path.resolve(appDir, `${appName}.app`),
    out: path.dirname(outPath),
  };

  createDMG(dmgConfig)
    .then(() => {
      console.log("App packaged successfully");
    })
    .catch((e) => {
      console.log(`Error occured: ${e.message}`);
      exit(1);
    });
}

const args = process.argv.slice(2);
const appDir = path.resolve(args[0]);
const makeDir = args[1];
const appName = args[2];
const background = args[3];
const icon = args[4];

if (appDir === undefined) {
  console.log("appDir is undefined");
  exit(1);
}

if (makeDir === undefined) {
  console.log("Make directory is undefined");
  exit(1);
}

if (appName === undefined) {
  console.log("App name is undefined");
  exit(1);
}

if (background === undefined) {
  console.log("Background is undefined");
  exit(1);
}

if (icon === undefined) {
  console.log("Icon is undefined");
  exit(1);
}

make(appDir, makeDir, appName, background, icon);
