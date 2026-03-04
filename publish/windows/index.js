import { createWindowsInstaller } from "electron-winstaller";
import fs from "node:fs/promises";
import path from "node:path";
import { exit } from "node:process";

async function createApp(version, keypairAlias, certfile) {
  const __dirname = import.meta.dirname;
  const parent = path.resolve(__dirname, "..", "..");
  const windowsSignLogCandidates = [
    path.join(
      __dirname,
      "node_modules",
      "electron-winstaller",
      "vendor",
      "electron-windows-sign.log",
    ),
    path.join(__dirname, "electron-windows-sign.log"),
    path.join(parent, "electron-windows-sign.log"),
    path.join(process.cwd(), "electron-windows-sign.log"),
  ];

  // Enable useful logs from installer + signer internals in CI.
  process.env.DEBUG = process.env.DEBUG
    ? `${process.env.DEBUG},electron-windows-installer:main,electron-windows-sign`
    : "electron-windows-installer:main,electron-windows-sign";

  try {
    let params = {
      appDirectory: path.join(parent, "out", `Kenku FM-win32-${process.arch}`),
      outputDirectory: path.join(parent, "out", "windows"),
      loadingGif: path.join(parent, "src", "assets", "loading.gif"),
      setupIcon: path.join(parent, "src", "assets", "setup.ico"),
      iconUrl: path.join(parent, "src", "assets", "setup.ico"),
      noMsi: true,
      exe: "kenku-fm.exe",
      name: `kenku-fm-win32-${process.arch}`,
      setupExe: `kenku-fm-win32-${process.arch}-${version}.exe`,
    };

    if (process.arch === "x64") {
      const normalizedCertPath = path.win32.normalize(certfile);
      params.windowsSign = {
        debug: true,
        hashes: ["sha256"],
        timestampServer: "http://timestamp.digicert.com",
        signWithParams: [
          "/csp",
          "DigiCert Signing Manager KSP",
          "/kc",
          keypairAlias,
          "/f",
          normalizedCertPath,
        ],
      };
    }

    await createWindowsInstaller(params);
  } catch (e) {
    console.log(`Error occured: ${e.message}`);
    if (e.stack) {
      console.log(e.stack);
    }
    let foundSignerLog = false;
    for (const logPath of windowsSignLogCandidates) {
      try {
        const signerLog = await fs.readFile(logPath, "utf8");
        if (signerLog.trim()) {
          foundSignerLog = true;
          console.log(`---- @electron/windows-sign log (${logPath}) ----`);
          console.log(signerLog);
        }
      } catch {
        // Ignore missing log files.
      }
    }

    if (!foundSignerLog) {
      console.log(
        "No electron-windows-sign.log file was found in expected locations.",
      );
    }
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
