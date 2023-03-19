const path = require("path");
const fs = require("fs");

const config = {
  packagerConfig: {
    executableName: "kenku-fm",
    out: "./out",
    icon: "./src/assets/icon",
    appBundleId: "com.kenku.fm",
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "kenku_fm",
        setupIcon: path.join(__dirname, "src", "assets", "setup.ico"),
        loadingGif: path.join(__dirname, "src", "assets", "loading.gif"),
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        name: "kenku_fm",
        productName: "Kenku FM",
        homepage: "https://kenku.fm",
        icon: path.join(__dirname, "src", "assets", "icons", "256x256.png"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["linux", "darwin"],
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        name: "kenku_fm",
        productName: "Kenku FM",
        homepage: "https://kenku.fm",
        icon: path.join(__dirname, "src", "assets", "icons", "256x256.png"),
      },
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "owlbear-rodeo",
          name: "kenku-fm",
        },
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
  ],
  hooks: {
    packageAfterCopy: async (_, buildPath) => {
      await fs.promises.copyFile(
        path.join(__dirname, "disgo", "disgo"),
        path.resolve(buildPath, path.join(".webpack", "main", "disgo"))
      );
    },
  },
};

module.exports = config;
