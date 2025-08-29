import { exit } from "node:process";
import path from "node:path";
import { createDMG } from "electron-installer-dmg";

function make() {
  const __dirname = import.meta.dirname;
  const srcDir = path.resolve(__dirname, "..", "..");
  const appName = "Kenku FM"

  const dmgConfig = {
    overwrite: true,
    name: appName,
    background: path.join(srcDir, "src", "assets", "dmg-background.png"),
    icon: path.join(srcDir, "src", "assets", "setup.icns"),
    appPath: path.join(srcDir, "out", `Kenku FM-darwin-${process.arch}`, `${appName}.app`),
    out: path.join(srcDir, "out", `Kenku FM-darwin-${process.arch}`)
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

make();