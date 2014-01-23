var Client = require('./radar_client'),
    instance = new Client(),
    Backoff = require('./backoff.js');

instance._log = require('minilog');
instance._logger = instance._log('radar_client');
instance.Backoff = Backoff;

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance;
