const electronInstaller = require("electron-winstaller");
const path = require("path");

async function createApp(dir, version, certPassword) {
    try {
        await electronInstaller.createWindowsInstaller({
            appDirectory: path.join(dir, "out", "Kenku FM-win32-x64"),
            outputDirectory: path.join(dir, "out", "windows"),
            loadingGif: path.join("src", "assets", "loading.gif"),
            setupIcon: path.join(dir, "src", "assets", "setup.ico"),
            iconUrl: path.join(dir, "src", "assets", "setup.ico"),
            noMsi: true,
            exe: "kenku-fm.exe",
            setupExe: `kenku-fm-${version}-setup.exe`,
            signWithParams: `/a /f "${path.join(dir, "certificate.pfx")}" /p "${certPassword}" /tr "http://timestamp.comodoca.com" /td "sha256" /fd "sha256"`
          });
    } catch (e) {
        console.log(`Error occured: ${e.message}`)
    }    
}

const args = process.argv.slice(2)
const dir = path.resolve(args[0])
const certPassword = path.resolve(args[2])
createApp(dir, args[1], certPassword)