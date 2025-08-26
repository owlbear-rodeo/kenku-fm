import { createWindowsInstaller } from "electron-winstaller";
import path from "node:path";
import { exit } from "node:process";

async function createApp(version, certPassword) {
  const __dirname = import.meta.dirname;
  const parent = path.resolve(__dirname, "..", "..");
  try {
    await createWindowsInstaller({
      appDirectory: path.join(parent, "out", `Kenku FM-win32-${process.arch}`),
      outputDirectory: path.join(parent, "out", "windows"),
      loadingGif: path.join(parent, "src", "assets", "loading.gif"),
      setupIcon: path.join(parent, "src", "assets", "setup.ico"),
      iconUrl: path.join(parent, "src", "assets", "setup.ico"),
      noMsi: true,
      exe: "kenku-fm.exe",
      setupExe: `kenku-fm-${version}-win32-${process.arch}.exe`,
      signWithParams: `/a /f "${path.join(
        parent,
        "certificate.pfx"
      )}" /p "${certPassword}" /tr "http://timestamp.comodoca.com" /td "sha256" /fd "sha256"`,
    });
  } catch (e) {
    console.log(`Error occured: ${e.message}`);
    exit(1);
  }
}

const args = process.argv.slice(2);
const appVersion = args[0];
const certPassword = args[1];

if (appVersion === undefined) {
  console.log("app version is undefined");
  exit(1);
}

if (certPassword === undefined) {
  console.log("password is undefined");
  exit(1);
}

createApp(appVersion, certPassword);
