var logger = require('minilog')('message:request');

var opTable = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync', 'unsubscribe']
};

// Avoids need for use of Object.keys (or backfill) on OpTable
var opTableKeys = ['control', 'message', 'presence', 'status', 'stream'];

var Request = function (operation, scope) {
  this.message = {
    op: operation,
    to: scope
  };

  if (!this._isValid()) {
    logger.error('invalid request. op: ' + this.op + '; to: ' + this.to);
  }
};

Request.buildGet = function (scope, options) {
  return new Request('get', scope).setOptions(options);
};

Request.buildPublish = function (scope, value) {
  var request = new Request('publish', scope);
  request.setAttr('value', value);

  return request;
};

Request.buildPush = function (scope, resource, action, value) {
  var request = new Request('push', scope);
  request.setAttr('resource', resource);
  request.setAttr('action', action);
  request.setAttr('value', value);

  return request;
};

Request.buildNameSync = function (scope, options) {
  return new Request('nameSync', scope).setOptions(options);
};

Request.buildSet = function (scope, value, clientData, key, userType) {
  var request = new Request('set', scope);
  request.setAttr('value', value);
  if (clientData) {
    request.setAttr('clientData', clientData);
  }
  request.setAttr('key', key);
  request.setAttr('type', userType);

  return request;
};

Request.buildSync = function (scope, options) {
  return new Request('sync', scope).setOptions(options);
};

Request.buildSubscribe = function (scope, options) {
  return new Request('subscribe', scope).setOptions(options);
};

Request.buildUnsubscribe = function (scope, options) {
  return new Request('unsubscribe', scope);
};

// TO DO: config class should return the required data via getters
Request.prototype.setAuthData = function (configuration) {
  this.setAttr('userData', configuration.userData);
  if (configuration.auth) {
    this.setAttr('auth', configuration.auth);
    this.setAttr('userId', configuration.userId);
    this.setAttr('userType', configuration.userType);
    this.setAttr('accountName', configuration.accountName);
  }
};

Request.getAttr = function (message, attr) {
  return (message && message[attr]);
};

// Instance methods

Request.prototype.getMessage = function () {
  return this.message;
};

Request.prototype.setOptions = function (options) {
  if (options) {
    this.setAttr('options', options);
  }

  return this;
};

Request.prototype.isPresence = function () {
  return this.type === 'presence';
};

Request.prototype.setAttr = function (keyName, keyValue) {
  if (keyName) {
    this.message[keyName] = keyValue;
  }
};

Request.prototype.getAttr = function (keyName) {
  if (keyName) {
    return this.message[keyName];
  }
};

Request.prototype.getVersion = function () {
  return this.message.options.version;
};

Request.prototype.payload = function () {
  return JSON.stringify(this.getMessage());
};


// Private methods

Request.prototype._isValid = function () {
  if (!this.message.op || !this.message.to) {
    return false;
  }

  var type = this._getType();
  if (type) {
    this.type = type;
    return this._isValidType(type) && this._isValidOperation(type);
  } else {
    logger.error('missing type');
  }
  return false;
};

Request.prototype._isValidType = function () {
  var isValid = opTableKeys.indexOf(this.type) >= 0;
  if (!isValid) {
    logger.error('invalid type: ' + this.type);
  }
  return isValid;
};

Request.prototype._isValidOperation = function () {
  var ops = opTable[this.type];

  var isValid = ops && ops.indexOf(this.message.op) >= 0;
  if (!isValid) {
    logger.error('invalid operation for type: ' + this.type);
  }
  return isValid;
};

Request.prototype._getType = function () {
  return this.message.to.substring(0, this.message.to.indexOf(':'));
};

module.exports = Request;
