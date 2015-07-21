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
  if (value) {
    request.message.value = value;

    return request;
  }
};

Request.buildPush = function (scope, resource, action, value) {
  var request = new Request('push', scope);
  if (resource && action && value) {
    request.message.resource = resource;
    request.message.action = action;
    request.message.value = value;

    return request;
  } else {
    throw new Error('Invalid push request message.');
  }
};

Request.buildNameSync = function (scope, options) {
  return new Request('nameSync', scope).setOptions(options);
};

Request.buildSet = function (scope, value, clientData, key, userType) {
  var request = new Request('set', scope);
  if (value) {
    request.message.value = value;
    request.message.key = key;
    request.message.type= userType;
    if (typeof(clientData) != 'function') {
      request.message.clientData = clientData;
    }

    return request;
  }
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

Request.prototype.getMessage = function () {
  return this.message;
};

Request.prototype.setOptions = function (options) {
  if (options && typeof options != 'function') {
    this.message.options = options;
  }

  return this;
};

Request.prototype.setOptionsVersion = function (version) {
  if (this.options) {
    this.options.version = version;
  } else {
    this.options = { version: version };
  }
};

Request.prototype.isOptionsSet = function () {
  return !!this.message.options;
};

Request.prototype.isPresence = function () {
  return this.type === 'presence';
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

Request.getAck = function (message) {
  return (message && message.ack);
};

Request.getOp = function (message) {
  return (message && message.op);
};

Request.getTo = function (message) {
  return (message && message.to);
};

Request.getValue = function (message) {
  return (message && message.value);
};

Request.getTime = function (message) {
  return (message && message.time);
};

Request.setAck = function (message, ack) {
  if (message && ack) { message.ack = ack; }
};

// scope = 'presence:/this/ticket/1'
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
