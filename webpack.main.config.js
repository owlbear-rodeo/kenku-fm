const SentryWebpackPlugin = require("@sentry/webpack-plugin");

const isProduction = process.env.CI;

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  output: {
    sourceMapFilename: "[id].[contenthash].min.js"
  },
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
  devtool: "source-map",
  mode: isProduction ? 'production' : 'development',
  plugins: [
    isProduction && new SentryWebpackPlugin({
          org: "owlbear-rodeo",
          project: "kenku-fm",
          include: ["./.webpack/main/**/*"],
          urlPrefix: "~/.webpack/main",
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: `Kenku-FM@${process.env.VERSION}`,
          sourceMapReference: false
        }),
  ].filter(n => n),
  externals: {
    opusscript: "commonjs2 opusscript",
    "prism-media": "commonjs2 prism-media",
    "libsodium-wrappers": "commonjs2 libsodium-wrappers",
    "discord.js": "commonjs2 discord.js",
  },
};
