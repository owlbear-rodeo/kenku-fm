const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const version = require('./package.json').version;

const isProduction = process.env.CI;

const config = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
  devtool: "source-map",
  mode: "development",
  externals: {
    opusscript: "commonjs2 opusscript",
    "prism-media": "commonjs2 prism-media",
    "libsodium-wrappers": "commonjs2 libsodium-wrappers",
    "discord.js": "commonjs2 discord.js",
  },
};

if (isProduction) {
  config.mode = "production"
  config.plugins = [
    new SentryWebpackPlugin({
      org: "owlbear-rodeo",
      project: "kenku-fm",
      include: ["./.webpack/main/**/*"],
      urlPrefix: "~/.webpack/main",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: `Kenku-FM@${version}`,
    }),
  ]
}

module.exports = config;