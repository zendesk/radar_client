var log = require('minilog')('radar_client'),
    MicroEE = require('microee'),
    eio = require('engine.io-client'),
    Scope = require('./scope.js'),
    StateMachine = require('./state.js');

function Client(backend) {
  var self = this;
  this.connections = 0;
  this.configuration = this._me = { accountName: '', userId: 0, userType: 0 };
  this._ackCounter = 1;
  this._channelSyncTimes = {};
  this._users = {};

  // allow backend substitution for tests
  this.backend = backend || eio;
  this.manager = StateMachine.create(this);

  // this should be overridden by removing it with client.removeAllListeners('authenticateMessage');
  this.on('authenticateMessage', function(message) {
    if (this.configuration.auth) {
      message.auth = this.configuration.auth;
      message.userId = this.configuration.userId;
      message.userType = this.configuration.userType;
      message.accountName = this.configuration.accountName;
    }

    this.emit('messageAuthenticated', message);
  });

  // this should be overridden by removing it with client.removeAllListeners('authenticate');
  this.on('authenticate', function() {
    this.emit('authenticated');
  });
}

MicroEE.mixin(Client);

Client.prototype.createSocket = function() {
  return new this.backend.Socket(this.configuration);
};

// alloc() and dealloc() rather than connect() and disconnect() - see readme.md
Client.prototype.alloc = function(name, callback) {
  var self = this;
  log.info({ op: 'alloc', name: name });
  this._users[name] = true;
  callback && this.once('ready', function() {
    self._users.hasOwnProperty(name) && callback();
  });

  this.manager.start();
  return this;
};

Client.prototype.dealloc = function(name) {
  log.info({ op: 'dealloc', name: name });
  delete this._users[name];
  var count = 0, key;
  for(key in this._users) {
    if(this._users.hasOwnProperty(key)) count++;
  }
  if(count === 0) {
    this.manager.close();
  }
};

Client.prototype.configure = function(configuration) {
  configuration = configuration || {};
  configuration.userType = configuration.userType || 0;
  this.configuration = this._me = configuration;
  this.manager.configure(configuration);
  return this;
};

Client.prototype.authenticate = function() {
  this.emit('authenticate');
};

Client.prototype.authenticateMessage = function(message) {
  this.emit('authenticateMessage', message);
};

Client.prototype.ready = function() {
  this.emit('ready');
};

Client.prototype.connected = function() {
  this.emit(++this.connections > 1 ? 'reconnect' : 'connect');
  this.emit('ready');
};

Client.prototype.disconnected = function(permanent) {
  this.emit('disconnected');

  if (permanent) {
    this.unavailable();
  }
};

Client.prototype.unavailable = function() {
  this.emit('unavailable');
};

Client.prototype.messageReceived = function (msg) {
  var message = JSON.parse(msg);
  message.direction = 'in';
  log.info(message);
  switch(message.op) {
    case 'err':
    case 'ack':
    case 'get':
      this.emit(message.op, message);
      break;
    case 'sync':
      this._batch(message);
      break;
    default:
      this.emit(message.to, message);
  }
};

Client.prototype.message = function(scope) {
  return new Scope('message:/'+this.configuration.accountName+'/'+scope, this);
};

// Access the "presence" chainable operations
Client.prototype.presence = function(scope) {
  return new Scope('presence:/'+this.configuration.accountName+'/'+scope, this);
};

// Access the "status" chainable operations
Client.prototype.status = function(scope) {
  return new Scope('status:/'+this.configuration.accountName+'/'+scope, this);
};

Client.prototype.set = function(scope, value, callback) {
  return this._write({
    op: 'set',
    to: scope,
    value: value,
    key: this.configuration.userId,
    type: this.configuration.userType
  }, callback);
};

Client.prototype.publish = function(scope, value, callback) {
  return this._write({
    op: 'publish',
    to: scope,
    value: value
  }, callback);
};

Client.prototype.subscribe = function(scope, callback) {
  return this._write({ op: 'subscribe', to: scope }, callback);
};

Client.prototype.unsubscribe = function(scope, callback) {
  return this._write({ op: 'unsubscribe', to: scope }, callback);
};

// Sync and get return the actual value of the operation
var init = function(name) {
  Client.prototype[name] = function(scope, options, callback) {
    var message = { op: name, to: scope };
    // options is a optional argument
    if(typeof options == 'function') {
      callback = options;
    } else {
      message.options = options;
    }
    // sync v1 for presence scopes acts inconsistently. The result should be a "get" message,
    // but it is actually a "online" message.
    if(name == 'sync' && !message.options && scope.match(/^presence.+/)) {
      this.once(scope, callback);
    } else {
      this.when('get', function(message) {
        if(!message || !message.to || message.to != scope) { return false; }
        callback && callback(message);
        return true;
      });
    }
    // sync/get never register or retuin acks (since they always send back a data message)
    return this._write(message);
  };
};

var props = ['get', 'sync'];
for(var i = 0; i < props.length; i++){
  init(props[i]);
}

Client.prototype._write = function(message, callback) {
  if(this.configuration && this.configuration.auth) {
    message.auth = this.configuration.auth;
    message.userId = this.configuration.userId;
    message.userType = this.configuration.userType;
    message.accountName = this.configuration.accountName;
  }
  if(callback) {
    message.ack = this._ackCounter++;
    // wait ack
    this.when('ack', function(m) {
      if(!m || !m.value || m.value != message.ack) { return false; }
      callback(message);
      return true;
    });
  }
  this.manager.send(message);
  return this;
};

Client.prototype._batch = function(msg) {
  if(!(msg.to && msg.value && msg.time)) { return; }

  var index = 0,
      length = msg.value.length,
      newest = msg.time,
      current = this._channelSyncTimes[msg.to] || 0;

  for(; index < length; index = index + 2) {
    var message = msg.value[index],
        time = msg.value[index + 1];
    try {
      message = JSON.parse(message);
    } catch(e) { throw e; }
    if(time > current) { this.emit(msg.to, message); }
    if(time > newest) { newest = time; }
  }
  this._channelSyncTimes[msg.to] = newest;
};

Client.setBackend = function(lib) { eio = lib; };

module.exports = Client;
