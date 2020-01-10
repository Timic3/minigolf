const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  // mode: 'production',
  entry: './src/scripts/index.ts',
  devtool: 'inline-source-map',
  node: {
    fs: 'empty'
  },
  output: {
    //path: path.join(__dirname, 'dist/'),
    filename: 'js/[name].bundle.js',
    chunkFilename: 'js/[name].chunk.js',
    //publicPath: '/assets',
  },
  devServer: {
    contentBase: './dist',
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader?sourceMap=true', 'sass-loader',
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              config: {
                path: 'postcss.config.js'
              }
            }
          },
          {
            loader: 'sass-loader', options: { sourceMap: true }
          }
        ],
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: "file-loader?name=/assets/[name].[ext]",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
    }),
    new CopyWebpackPlugin([
      { from: './src/assets', to: 'assets' }
    ]),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
