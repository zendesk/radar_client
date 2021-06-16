const Client = require('./radar_client')
const instance = new Client()
const Backoff = require('./backoff.js')

instance._log = require('minilog')
instance.Backoff = Backoff

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance
