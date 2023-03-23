const electronInstaller = require("electron-winstaller");
const path = require("path");
const { exit } = require("process");

async function createApp(dir, version, certPassword) {
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(dir, "out", "Kenku FM-win32-x64"),
      outputDirectory: path.join(dir, "out", "windows"),
      loadingGif: path.join(dir, "src", "assets", "loading.gif"),
      setupIcon: path.join(dir, "src", "assets", "setup.ico"),
      iconUrl: path.join(dir, "src", "assets", "setup.ico"),
      noMsi: true,
      exe: "kenku-fm.exe",
      setupExe: `kenku-fm-${version}-win32-${process.arch}.exe`,
      signWithParams: `/a /f "${path.join(
        dir,
        "certificate.pfx"
      )}" /p "${certPassword}" /tr "http://timestamp.comodoca.com" /td "sha256" /fd "sha256"`,
    });
  } catch (e) {
    console.log(`Error occured: ${e.message}`);
    exit(1);
  }
}

const args = process.argv.slice(2);
const dir = path.resolve(args[0]);
const appVersion = args[1];
const certPassword = args[2];

if (dir === undefined) {
  console.log("directory is undefined");
  exit(1);
}

if (appVersion === undefined) {
  console.log("app version is undefined");
  exit(1);
}

if (certPassword === undefined) {
  console.log("password is undefined");
  exit(1);
}

createApp(dir, appVersion, certPassword);
