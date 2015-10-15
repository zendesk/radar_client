// Add the package version to radar_client.js prior to building dist
var version = require('../package.json').version,
    fs = require('fs');

var FILEPATH = 'lib/client_version.js';

// Create the string to write
var fileContents = '// Auto-generated file, overwritten by'
                    + ' scripts/add_package_version.js\n\n'
                    + 'function getClientVersion() { return \''
                    + version
                    + '\'; };\n\n'
                    + 'module.exports = getClientVersion;';

// Rewrite the file lib/version.js to contain a current getVersion()
if (fs.exists(FILEPATH)) {
  fs.unlinkSync(FILEPATH);
}

// Write the client version to a new instance of the file
var stream = fs.createWriteStream(FILEPATH);
stream.once('open', function () {
  stream.write(fileContents);
  stream.end()
});
