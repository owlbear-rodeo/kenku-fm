module.exports = {
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
  externals: {
    opusscript: "commonjs2 opusscript",
    "prism-media": "commonjs2 prism-media",
    "libsodium-wrappers": "commonjs2 libsodium-wrappers",
    "discord.js": "commonjs2 discord.js",
  },
};
