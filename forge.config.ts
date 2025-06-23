import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { execSync } from "child_process";
import path from "path";

const config: ForgeConfig = {
  packagerConfig: {
    executableName: "kenku-fm",
    icon: "./src/assets/icon",
    appBundleId: "com.kenku.fm",
  },
  hooks: {
    postMake: async (config, makeResults) => {
      console.log("Post-make hook triggered");

      // Verify python
      try {
        execSync("python --version", { stdio: "ignore" });
      } catch (err) {
        console.error("Python is not installed or not found in PATH.");
        throw new Error("Python is required for post-make signing.");
      }

      // Find the Windows make result
      const winResult = makeResults.find(
        (result) => result.platform === "win32"
      );
      if (winResult && winResult.artifacts && winResult.artifacts.length > 0) {
        const arch = winResult.arch || "x64";
        const pkgPath = `out\\Kenku FM-win32-${arch}`;

        try {
          // Re-authenticate
          execSync(
            `python -m castlabs_evs.account -n reauth -A "${process.env.CASTLABS_ACCOUNT_NAME}" -P "${process.env.CASTLABS_ACCOUNT_PASSWORD}"`,
            { stdio: "inherit" }
          );
          // Sign the package
          execSync(`python -m castlabs_evs.vmp sign-pkg "${pkgPath}"`, {
            stdio: "inherit",
          });
          console.log("Castlabs signing complete.");
        } catch (err) {
          console.error("Castlabs signing failed:", err);
          throw err;
        }
      }

      return makeResults;
    },
  },
  makers: [
    new MakerSquirrel(
      {
        name: "kenku_fm",
        setupIcon: path.join(__dirname, "src", "assets", "setup.ico"),
        loadingGif: path.join(__dirname, "src", "assets", "loading.gif"),
      },
      ["win32"]
    ),
    new MakerDeb(
      {
        options: {
          name: "kenku_fm",
          productName: "Kenku FM",
          homepage: "https://kenku.fm",
          icon: path.join(__dirname, "src", "assets", "icons", "256x256.png"),
          bin: "kenku-fm",
          categories: ["AudioVideo", "Audio"],
        },
      },
      ["linux"]
    ),
    new MakerRpm(
      {
        options: {
          name: "kenku_fm",
          productName: "Kenku FM",
          homepage: "https://kenku.fm",
          icon: path.join(__dirname, "src", "assets", "icons", "256x256.png"),
          bin: "kenku-fm",
          categories: ["AudioVideo", "Audio"],
        },
      },
      ["linux"]
    ),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "fronix",
          name: "kenku-fm",
        },
        generateReleaseNotes: true,
        prerelease: false,
        draft: false,
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.ts",
              name: "main_window",
              preload: {
                js: "./src/preload.ts",
              },
            },
            {
              html: "./src/player/index.html",
              js: "./src/player/renderer.ts",
              name: "player_window",
              preload: {
                js: "./src/player/preload.ts",
              },
            },
            {
              html: "./src/audioCapture/index.html",
              js: "./src/audioCapture/renderer.ts",
              name: "audio_capture_window",
              preload: {
                js: "./src/audioCapture/preload.ts",
              },
            },
          ],
        },
        devContentSecurityPolicy: "",
      },
    },
    {
      name: "@timfish/forge-externals-plugin",
      config: {
        externals: [
          "opusscript",
          "prism-media",
          "libsodium-wrappers",
          "discord.js",
        ],
        includeDeps: true,
      },
    },
  ],
};

module.exports = config;
