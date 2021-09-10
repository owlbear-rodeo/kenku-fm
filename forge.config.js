module.exports = {
  packagerConfig: {
    icon: "./src/assets/icon",
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "kenku_forge",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
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
        externals: ["ffmpeg-static", "opusscript", "prism-media", "discord.js"],
        includeDeps: true,
      },
    ],
  ],
};
