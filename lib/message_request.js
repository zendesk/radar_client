var logger = require('minilog')('message:request');

var opTable = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync', 'unsubscribe']
};

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
  var request = new Request('get', scope);
  if (request) {
    request.setOptions(options);
  }

  return request;
};

Request.buildPublish = function (scope, value) {
  var request = new Request('publish', scope);
  if (request) {
    request.setAttr('value', value);
  }

  return request;
};

Request.buildPush = function (scope, resource, action, value) {
  var request = new Request('push', scope);
  if (request) {
    request.setAttr('resource', resource);
    request.setAttr('action', action);
    request.setAttr('value', value);
  }

  return request;
};

Request.buildNameSync = function (scope, options) {
  var request = new Request('nameSync', scope);
  if (request) {
    request.setOptions(options);
  }

  return request;
};

Request.buildSet = function (scope, value, key, userType) {
  var request = new Request('set', scope);

  if (request) {
    request.setAttr('value', value);
    request.setAttr('key', key);
    request.setAttr('type', userType);
  }

  return request;
};

Request.buildSync = function (scope) {
  return new Request('sync', scope);
};

Request.buildSubscribe = function (scope) {
  return new Request('subscribe', scope);
};

Request.buildUnsubscribe = function (scope, options) {
  return new Request('unsubscribe', scope);
};

// TO DO: config class should return the required data via getters
Request.prototype.setAuthData = function (configuration) {
  if (configuration && configuration.auth) {
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
    this.message.options = options;
    this.message.options.version = 2;
  } else {
    this.message.options = { version: 1 };
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
  var types = Object.keys(opTable);
  for (var i = 0; i < types.length; i++) {
    if (types[i] === this.type) { return true; }
  }
  logger.error('invalid type: ' + this.type);
  return false;
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
