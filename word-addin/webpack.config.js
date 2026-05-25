const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const certDir = path.join(require('os').homedir(), '.office-addin-dev-certs');
const certPath = path.join(certDir, 'localhost.crt');
const keyPath = path.join(certDir, 'localhost.key');
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);
const prod = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    taskpane: './src/taskpane.js',
    commands: './src/commands.js',
  },
  output: {
    // Production: output to parent project's dist/word-addin/ (served by Worker)
    // Development: output to local dist/ (served by webpack-dev-server)
    path: prod ? path.resolve(__dirname, '../dist/word-addin') : path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: prod ? true : { keep: /models\// },
  },
  target: 'web',
  module: {
    rules: [{ test: /\.css$/, use: ['style-loader', 'css-loader'] }],
  },
  devServer: {
    static: [
      './dist',
      { directory: path.resolve(__dirname, '../dist/models'), publicPath: '/models' },
      { directory: path.resolve(__dirname, '../fonts'), publicPath: '/fonts' },
    ],
    port: 3000, hot: false,
    server: hasCerts ? {
      type: 'https',
      options: { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
    } : 'https',
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  plugins: [
    new HtmlWebpackPlugin({ filename: 'taskpane.html', template: './src/taskpane.html', chunks: ['taskpane'] }),
    new HtmlWebpackPlugin({ filename: 'commands.html', template: './src/commands.html', chunks: ['commands'] }),
    new CopyWebpackPlugin({ patterns: [
      { from: 'assets', to: 'assets', noErrorOnMissing: true },
      { from: '../fonts/NotoSerifCJKsc-Regular.otf', to: 'fonts/', noErrorOnMissing: true },
    ]}),
  ],
};
