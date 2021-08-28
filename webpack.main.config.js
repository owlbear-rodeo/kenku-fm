const rules = require("./webpack.rules");
const plugins = require("./webpack.plugins");

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: ["./src/index.ts"],
  // Don't package discord.js and it's dependencies as it doesn't work with webpack
  externals: {
    "discord.js": "commonjs2 discord.js",
    "ffmpeg-static": "commonjs2 ffmpeg-static",
    opusscript: "commonjs2 opusscript",
    "ytdl-core-discord": "commonjs2 ytdl-core-discord",
  },
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
