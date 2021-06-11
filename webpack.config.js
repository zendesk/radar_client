const path = require('path')

module.exports = {
  entry: './lib/index.js',
  externals: {
    minilog: 'Minilog',
    'engine.io-client': 'eio'
  },
  mode: 'production',
  node: {
    setImmediate: false
  },
  output: {
    filename: 'radar_client.js',
    library: 'RadarClient',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist')
  }
}
