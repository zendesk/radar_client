var logger = require('minilog')('message:request');

var opTable = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync']
};

var Request = function (operation, scope) {
  this.message = {
    op: operation,
    to: scope
  };

  if (!this._isValid()) {
    throw new Error('Invalid request message.');
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
  request._setAttrOptionalDefined('key', key);
  request._setAttrOptionalUndefined('type', userType);
  if (typeof(clientData) != 'function') {
    request._setAttrOptionalUndefined('clientData', clientData);
  }
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
Request.setUserData = function (message, configuration) {
  message.userData = configuration && configuration.userData;
};

// TO DO: config class should return the required data via getters
Request.setAuthData = function (message, configuration) {
  if (configuration && configuration.auth) {
    message.auth = configuration.auth;
    message.userId = configuration.userId;
    message.userType = configuration.userType;
    message.accountName = configuration.accountName;
  }
};

Request.getAttr = function (message, attr) {
  return (message && message[attr]);
};

Request.setAttr = function (message, attr, value) {
  if (message && attr) { message[attr] = value; }
};

// Instance methods

Request.prototype.getMessage = function () {
  return this.message;
};

Request.prototype.setOptions = function (options) {
  if (options && typeof options != 'function') {
    this.message.options = options;
    this.version = 2;
  } else {
    this.version = 1;
  }

  return this;
};

Request.prototype.isPresence = function () {
  return this.type === 'presence';
};

Request.prototype._setAttrOptionalUndefined = function (keyName, keyValue) {
  if (keyName) {
    this.message[keyName] = keyValue;
  }
};

Request.prototype._setAttrOptionalDefined = function (keyName, keyValue) {
  if (keyName && keyValue) {
    this.message[keyName] = keyValue;
  }
};

Request.prototype.setAttr = function (keyName, keyValue) {
  if (!keyName || !keyValue) {
    throw new Error('Invalid request attribute');
  }
  this.message[keyName] = keyValue;
};

Request.prototype.getAttr = function (keyName) {
  if (keyName) {
    return this.message[keyName];
  }
};

Request.prototype.getVersion = function () {
  return this.version;
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
  }
  return false;
};

Request.prototype._isValidType = function () {
  var types = Object.keys(opTable);
  for (var i = 0; i < types.length; i++) {
    if (types[i] === this.type) { return true; }
  }
  return false;
};

Request.prototype._isValidOperation = function () {
  var ops = opTable[this.type];
  return ops && ops.indexOf(this.message.op) >= 0;
};

Request.prototype._getType = function () {
  return this.message.to.substring(0, this.message.to.indexOf(':'));
};

module.exports = Request;
