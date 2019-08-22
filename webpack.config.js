const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'lib/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'radar_client.js',
    libraryTarget: 'var',
    library: 'RadarClient'
  },
  node: {
    setImmediate: false
  }
}
