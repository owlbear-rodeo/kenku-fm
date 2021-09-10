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
    "discord.js": "commonjs2 discord.js",
    "ffmpeg-static": "commonjs2 ffmpeg-static",
    opusscript: "commonjs2 opusscript",
  },
};
