const productIdentity = require("./product-identity.json");

const config = {
  rebuildConfig: {
    forceABI: 148,
  },
  packagerConfig: {
    executableName: productIdentity.packageName,
    out: "./out",
    appBundleId: productIdentity.applicationId,
    win32metadata: {
      CompanyName: "Dungeon Jockey contributors",
      FileDescription: productIdentity.displayName,
      InternalName: productIdentity.packageName,
      OriginalFilename: `${productIdentity.packageName}.exe`,
      ProductName: productIdentity.displayName,
    },
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "dungeon_jockey",
        appUserModelId: productIdentity.applicationId,
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        name: "dungeon_jockey",
        productName: productIdentity.displayName,
        homepage: "https://github.com/ProbablyRyan/kenku-fm",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["linux", "darwin"],
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        name: "dungeon_jockey",
        productName: productIdentity.displayName,
        homepage: "https://github.com/ProbablyRyan/kenku-fm",
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
        externals: ["opusscript", "prism-media", "@snazzah/davey"],
        includeDeps: true,
      },
    },
  ],
};

module.exports = config;
