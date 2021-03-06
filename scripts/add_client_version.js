// Add the package version to radar_client.js prior to building dist
const version = require('../package.json').version
const fs = require('fs')

const FILEPATH = 'lib/client_version.js'

// Create the string to write
const fileContents = '// Auto-generated file, overwritten by' +
  ' scripts/add_package_version.js\n\n' +
  "function getClientVersion () { return '" +
  version +
  "' }\n\n" +
  'module.exports = getClientVersion\n'

// Rewrite the file lib/version.js to contain a current getVersion()
if (fs.existsSync(FILEPATH)) {
  fs.unlinkSync(FILEPATH)
}

// Write the client version to a new instance of the file
const stream = fs.createWriteStream(FILEPATH)
stream.once('open', function () {
  stream.write(fileContents)
  stream.end()
})
