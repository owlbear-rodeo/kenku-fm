import { createWindowsInstaller } from "electron-winstaller";
import path from "node:path";
import { exit } from "node:process";

async function createApp(version, keypairAlias, certfile) {
  const __dirname = import.meta.dirname;
  const parent = path.resolve(__dirname, "..", "..");
  try {
    await createWindowsInstaller({
      windowsSign: {
        debug: true,
        timestampServer: "http://timestamp.digicert.com",
        hashes: ["sha256"],
        signWithParams: `/csp "DigiCert Signing Manager KSP" /kc "${keypairAlias}" /f "${certfile}"`,
      },
      appDirectory: path.join(parent, "out", `Kenku FM-win32-${process.arch}`),
      outputDirectory: path.join(parent, "out", "windows"),
      loadingGif: path.join(parent, "src", "assets", "loading.gif"),
      setupIcon: path.join(parent, "src", "assets", "setup.ico"),
      iconUrl: path.join(parent, "src", "assets", "setup.ico"),
      noMsi: true,
      exe: "kenku-fm.exe",
      name: `kenku-fm-win32-${process.arch}`,
      setupExe: `kenku-fm-win32-${process.arch}-${version}.exe`,
    });
  } catch (e) {
    console.log(`Error occured: ${e.message}`);
    exit(1);
  }
}

const args = process.argv.slice(2);
const appVersion = args[0];
const keypairAlias = args[1];
const certfile = args[2];

if (appVersion === undefined) {
  console.log("app version is undefined");
  exit(1);
}

if (keypairAlias === undefined) {
  console.log("keypairAlias is undefined");
  exit(1);
}

if (certfile === undefined) {
  console.log("certfile is undefined");
  exit(1);
}

createApp(appVersion, keypairAlias, certfile);
