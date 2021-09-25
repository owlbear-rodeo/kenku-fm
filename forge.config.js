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
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        debug: true,
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        name: "kenku_fm",
        productName: "Kenku FM",
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
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
