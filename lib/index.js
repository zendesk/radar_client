
var Client = require('./radar_client');
var Backoff = require('./backoff.js');

var create = function () {
  var instance = new Client();
  instance._log = require('minilog');
  instance.Backoff = Backoff;
  return instance;
};

module.exports = create;
