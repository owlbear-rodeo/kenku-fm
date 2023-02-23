const SentryWebpackPlugin = require("@sentry/webpack-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  output: {
    sourceMapFilename: "[id].[contenthash].min.cjs"
  },
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
  devtool: "source-map",
  mode: isDevelopment ? 'development' : 'production',
  plugins: [
    isDevelopment === 'production' && new SentryWebpackPlugin({
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
