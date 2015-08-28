var logger = require('minilog')('message:request');

var opTable = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync', 'unsubscribe']
};

var Request = function (message) {
  this.message = message;

  if (!this._isValid()) {
    logger.error('invalid request. op: ' + this.op + '; to: ' + this.to);
  }
};

Request.buildGet = function (scope, options) {
  var message = { op: 'get', to: scope};
  return new Request(message).setOptions(options);
};

Request.buildPublish = function (scope, value) {
  var message = { op: 'publish', to: scope};
  var request = new Request(message);
  request.setAttr('value', value);

  return request;
};

Request.buildPush = function (scope, resource, action, value) {
  var message = { op: 'push', to: scope};
  var request = new Request(message);
  request.setAttr('resource', resource);
  request.setAttr('action', action);
  request.setAttr('value', value);

  return request;
};

Request.buildNameSync = function (scope, options) {
  var message = { op: 'nameSync', to: scope};
  return new Request(message).setOptions(options);
};

Request.buildSet = function (scope, value, key, userType, clientData) {
  var message = { op: 'set', to: scope};
  var request = new Request(message);
  request.setAttr('value', value);
  request.setAttr('key', key);
  request.setAttr('type', userType);
  if (clientData) {
    request.setAttr('clientData', clientData);
  }

  return request;
};

Request.buildSync = function (scope, options) {
  var message = { op: 'sync', to: scope};
  return new Request(message).setOptions(options);
};

Request.buildSubscribe = function (scope, options) {
  var message = { op: 'subscribe', to: scope};
  return new Request(message).setOptions(options);
};

Request.buildUnsubscribe = function (scope, options) {
  var message = { op: 'unsubscribe', to: scope};
  return new Request(message);
};

// Instance methods

Request.prototype.setAuthData = function (configuration) {
  this.setAttr('userData', configuration.userData);
  if (configuration.auth) {
    this.setAttr('auth', configuration.auth);
    this.setAttr('userId', configuration.userId);
    this.setAttr('userType', configuration.userType);
    this.setAttr('accountName', configuration.accountName);
  }
};

Request.prototype.getMessage = function () {
  return this.message;
};

Request.prototype.setOptions = function (options) {
  if (options) {
    this.setAttr('options', options);
  } else if (!options && this.isPresence() && this.getAttr('op') === 'sync') {
    this.setAttr('options', { version: 2});
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
  for (var key in opTable) {
    if (opTable.hasOwnProperty(key) && this.type == key) {
      return true;
    }
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
