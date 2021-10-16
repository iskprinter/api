const nodeExternals = require('webpack-node-externals')
const path = require('path')

module.exports = {
  entry: './src/bin/www.ts',
  devtool: 'inline-source-map',
  mode: 'production',
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    modules: [path.resolve(__dirname, './'), 'node_modules']
  },
  target: 'node',
  externals: [nodeExternals()]
}
