const rules = require("./webpack.rules");
const plugins = require("./webpack.plugins");

rules.push({
  test: /\.css$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

rules.push({
  test: /\.worklet\.js$/,
  use: { loader: "worklet-loader", options: { inline: true } },
});

rules.push({
  test: /\.worker\.js$/,
  use: { loader: "worker-loader", options: { inline: "fallback" } },
});

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
  },
};
