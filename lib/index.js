var Client = require('./radar_client')
var instance = new Client()
var Backoff = require('./backoff.js')

instance._log = require('minilog')
instance.Backoff = Backoff

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance
