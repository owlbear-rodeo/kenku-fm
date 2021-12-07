const path = require("path");

const config = {
  packagerConfig: {
    executableName: "kenku-fm",
    out: "./out",
    icon: "./src/assets/icon",
    appBundleId: "com.kenku.fm",
    osxSign: {
      gatekeeperAssess: false,
      identity: "Developer ID Application: Mitchell McCaffrey (34SN58ZB9F)",
      "hardened-runtime": true,
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
      "signature-flags": "library",
    },
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
      name: "@electron-forge/maker-dmg",
      config: {
        background: path.join(__dirname, "src", "assets", "dmg-background.png"),
        icon: path.join(__dirname, "src", "assets", "setup.icns"),
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
      platforms: [
        "linux"
      ],
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
    [
      "@electron-forge/plugin-webpack",
      {
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
          ],
        },
        devContentSecurityPolicy: "",
      },
    ],
    [
      "@timfish/forge-externals-plugin",
      {
        externals: ["opusscript", "@owlbear-rodeo/discord.js"],
        includeDeps: true,
      },
    ],
  ],
};

function notarizeMaybe() {
  if (process.platform !== "darwin") {
    return;
  }

  if (!process.env.CI) {
    console.log(`Not in CI, skipping notarization`);
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn(
      "Should be notarizing, but environment variables APPLE_ID or APPLE_ID_PASSWORD are missing!"
    );
    return;
  }

  config.packagerConfig.osxNotarize = {
    appBundleId: "com.kenku.fm",
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    ascProvider: "34SN58ZB9F",
  };
}

notarizeMaybe();

module.exports = config;
