/* globals setImmediate */
var MicroEE = require('microee'),
    eio = require('engine.io-client'),
    Scope = require('./scope.js'),
    StateMachine = require('./state.js'),
    immediate = typeof setImmediate != 'undefined' ? setImmediate :
                                    function(fn) { setTimeout(fn, 1); },
    getClientVersion = require('./client_version.js'),
    Message = require('./message.js');

function Client(backend) {
  var self = this;
  this.logger = require('minilog')('radar_client');
  this._ackCounter = 1;
  this._channelSyncTimes = {};
  this._uses = {};
  this._presences = {};
  this._subscriptions = {};
  this._restoreRequired = false;
  this._queuedMessages = [];
  this._isConfigured = false;

  this._createManager();
  this.configure(false);
  this._addListeners();

  // Allow backend substitution for tests
  this.backend = backend || eio;
}

MicroEE.mixin(Client);

// Public API

// Each use of the client is registered with "alloc", and a given use often
// persists through many connects and disconnects.
// The state machine - "manager" - handles connects and disconnects
Client.prototype.alloc = function(useName, callback) {
  var self = this;
  if (!this._uses[useName]) {
    this.logger().info('alloc: ', useName);
    this.once('ready', function() {
      self.logger().info('ready: ', useName);
    });

    this._uses[useName] = true;
  }

  callback && this.once('ready', function() {
    if (self._uses.hasOwnProperty(useName)) {
      callback();
    }
  });

  if (this._isConfigured) {
    this.manager.start();
  } else {
    this._waitingForConfigure = true;
  }

  return this;
};

// When done with a given use of the client, unregister the use
// Only when all uses are unregistered do we disconnect the client
Client.prototype.dealloc = function(useName) {
  this.logger().info({ op: 'dealloc', useName: useName });

  delete this._uses[useName];

  var stillAllocated = false, key;

  for (key in this._uses) {
    if (this._uses.hasOwnProperty(key)) {
      stillAllocated = true;
      break;
    }
  }
  if (!stillAllocated) {
    this.logger().info("closing the connection");
    this.manager.close();
  }
};

Client.prototype.currentState = function() {
  return this.manager.current;
};

Client.prototype.configure = function(hash) {
  var configuration = hash || this._configuration || { accountName: '', userId: 0, userType: 0 };
  configuration.userType = configuration.userType || 0;
  this._configuration = this._me = configuration;
  this._isConfigured = this._isConfigured || !!hash;

  if (this._isConfigured && this._waitingForConfigure) {
    this._waitingForConfigure = false;
    this.manager.start();
  }

  return this;
};

Client.prototype.configuration = function(configKey) {
  return configKey in this._configuration ?
          JSON.parse(JSON.stringify(this._configuration[configKey])) : null;
};

Client.prototype.currentUserId = function() {
  return this._configuration && this._configuration.userId;
};

Client.prototype.currentClientId = function() {
  return this._socket && this._socket.id;
};

// Return the scope object for a given message type

Client.prototype.message = function(scope) {
  return new Scope(_scopeNameBuild('message', this._configuration, scope), this);
};

// Access the "presence" chainable operations
Client.prototype.presence = function(scope) {
  return new Scope(_scopeNameBuild('presence', this._configuration, scope), this);
};

// Access the "status" chainable operations
Client.prototype.status = function(scope) {
  return new Scope(_scopeNameBuild('status', this._configuration, scope), this);
};

Client.prototype.stream = function(scope) {
  return new Scope(_scopeNameBuild('stream', this._configuration, scope), this);
};

// Access the "control" chainable operations
Client.prototype.control = function(scope) {
  return new Scope(_scopeNameBuild('control', this._configuration, scope), this);
};

Client.prototype.nameSync = function(scope, options, callback) {
  var message = Message.requestNameSync(scope, options);
  if (message) {
    return this._write(message, callback);
  }
};

// Operations

Client.prototype.push = function(scope, resource, action, value, callback) {
  var message = Message.requestPush(scope, resource, action, value);
  if (message) {
    return this._write(message, callback);
  }
};

Client.prototype.set = function(scope, value, callback) {
  var message = Message.requestSet(scope, value, this._configuration.userId,
                                          this._configuration.userType);
  if (message) {
    return this._write(message, callback);
  }
};

Client.prototype.publish = function(scope, value, callback) {
  var message = Message.requestPublish(scope, value);
  if (message) {
    return this._write(message, callback);
  }
};

Client.prototype.subscribe = function(scope, options, callback) {
  var message = Message.requestSubscribe(scope, options);
  if (message) {
    if (typeof options === 'function') { callback = options; }

    return this._write(message, callback);
  }
};

Client.prototype.unsubscribe = function(scope, callback) {
  var message = Message.requestUnsubscribe(scope);
  if (message) {
    return this._write(message, callback);
  }
};

// sync returns the actual value of the operation
Client.prototype.sync = function (scope, options, callback) {
  var requestMessage = Message.requestSync(scope, options);
  if (requestMessage) {
    if (typeof options === 'function') { callback = options; }
    if (!Message.isOptionsSet(requestMessage) && scope.match(/^presence.+/)) {
      Message.setOptionsVersion(requestMessage, 2);

      this.when('get', function (responseMessage) {
        if (!Message.isValidScope(responseMessage, scope)) {
          return false;
        }
        Message.requestForceV2Presence(responseMessage, scope);

        if (callback) {
          callback(responseMessage);
        }
        return true;
      });
    } else {
      this.when('get', function(responseMessage) {
        if (!Message.isValidScope(responseMessage, scope)) {
          return false;
        }
        if (callback) {
          callback(responseMessage);
        }
        return true;
      });
    }

    // sync does not return ACK (it sends back a data message)
    return this._write(requestMessage);
  }
};

// get returns the actual value of the operation
Client.prototype.get = function (scope, options, callback) {
  var requestMessage = Message.requestGet(scope, options);
  if (requestMessage) {
    if (typeof options === 'function') { callback = options; }

    this.when('get', function (responseMessage) {
      if (!Message.isValidScope(responseMessage, scope)) {
        return false;
      }
      if (callback) {
        callback(responseMessage);
      }
      return true;
    });

    // get does not return ACK (it sends back a data message)
    return this._write(requestMessage);
  }
};

// Private API

var _scopeNameBuild = function (type, configuration, scope) {
  return type + ':/' + configuration.accountName + '/' + scope;
};

Client.prototype._addListeners = function () {
  // Add authentication data to a message; _write() emits authenticateMessage
  this.on('authenticateMessage', function(message) {
    Message.setUserData(message, this._configuration);
    Message.setAuthData(message, this._configuration);

    this.emit('messageAuthenticated', message);
  });

  // Once the message is authenticated, send it to the server
  this.on('messageAuthenticated', function(message) {
    this._sendMessage(message);
  });
};

Client.prototype._write = function(message, callback) {
  var self = this;

  if (callback) {
    Message.setAck(message, this._ackCounter++);

    // Wait ack
    this.when('ack', function(serverMessage) {
      self.logger().debug('ack', serverMessage);
      if (!Message.isValidAck(serverMessage, message)) {
        return false;
      }
      callback(message);

      return true;
    });
  }
  this.emit('authenticateMessage', message);
  return this;
};

Client.prototype._batch = function(message) {
  var to = Message.getTo(message),
      value = Message.getValue(message),
      time = Message.getTime(message);

  if (!to || !value || !time) {
    return false;
  }

  var index = 0, data,
      length = value.length,
      newest = time,
      current = this._channelSyncTimes[to] || 0;

  for (; index < length; index = index + 2) {
    data = JSON.parse(value[index]);
    time = value[index + 1];

    if (time > current) {
      this.emitNext(to, data);
    }
    if (time > newest) {
      newest = time;
    }
  }
  this._channelSyncTimes[to] = newest;
};

Client.prototype._createManager = function() {
  var self = this, manager = this.manager = StateMachine.create();

  manager.on('enterState', function(state) {
    self.emit(state);
  });

  manager.on('event', function(event) {
    self.emit(event);
  });

  manager.on('connect', function(data) {
    var socket = self._socket = new self.backend.Socket(self._configuration);

    socket.once('open', function() {
      self.logger().debug("socket open", socket.id);
      manager.established();
    });

    socket.once('close', function(reason, description) {
      self.logger().debug('socket closed', socket.id, reason, description);
      socket.removeAllListeners('message');
      self._socket = null;

      // Patch for polling-xhr continuing to poll after socket close (HTTP:POST
      // failure).  socket.transport is in error but not closed, so if a subsequent
      // poll succeeds, the transport remains open and polling until server closes
      // the socket.
      if (socket.transport) {
        socket.transport.close();
      }

      if (!manager.is('closed')) {
        manager.disconnect();
      }
    });

    socket.on('message', function (message) {
      self._messageReceived(message);
    });

    manager.removeAllListeners('close');
    manager.once('close', function() {
      socket.close();
    });
  });

  manager.on('activate', function() {
    self._identitySet();
    self._restore();
    self.emit('ready');
  });

  manager.on('authenticate', function() {
    // Can be overridden in order to establish an authentication protocol
    manager.activate();
  });

  manager.on('disconnect', function() {
    self._restoreRequired = true;
  });
};

// Memorize subscriptions and presence states; return "true" for a message that
// adds to the memorized subscriptions or presences
Client.prototype._memorize = function(message) {
  var op = Message.getOp(message),
      to = Message.getTo(message),
      value = Message.getValue(message);

  switch(op) {
    case 'unsubscribe':
      // Remove from queue
      if (this._subscriptions[to]) {
        delete this._subscriptions[to];
      }
      return true;

    case 'sync':
    case 'subscribe':
      if (this._subscriptions[to] != 'sync') {
        this._subscriptions[to] = op;
      }
      return true;

    case 'set':
      if (to.substr(0, 'presence:/'.length) == 'presence:/') {
        this._presences[to] = value;
        return true;
      }
  }

  return false;
};

Client.prototype._restore = function() {
  var item, i, to, message, counts = { subscriptions: 0, presences: 0, messages: 0 };
  if (this._restoreRequired) {
    this._restoreRequired = false;


    for (to in this._subscriptions) {
      if (this._subscriptions.hasOwnProperty(to)) {
        item = this._subscriptions[to];
        this[item](to);
        counts.subscriptions += 1;
      }
    }

    for (to in this._presences) {
      if (this._presences.hasOwnProperty(to)) {
        this.set(to, this._presences[to]);
        counts.presences += 1;
      }
    }

    while (this._queuedMessages.length) {
      this._write(this._queuedMessages.shift());
      counts.messages += 1;
    }

    this.logger().debug('restore-subscriptions', counts);
  }
};

Client.prototype._sendMessage = function(message) {
  var memorized = this._memorize(message),
      ack = Message.getAck(message);

  this.emit('message:out', message);

  if (this._socket && this.manager.is('activated')) {
    this._socket.sendPacket('message', JSON.stringify(message));
  } else if (this._isConfigured) {
    this._restoreRequired = true;
    if (!memorized || ack) {
      this._queuedMessages.push(message);
    }
    this.manager.connectWhenAble();
  }
};

Client.prototype._messageReceived = function (msg) {
  var message = JSON.parse(msg),
      op = Message.getOp(message),
      to = Message.getTo(message);

  this.emit('message:in', message);

  switch (op) {
    case 'err':
    case 'ack':
    case 'get':
      this.emitNext(op, message);
      break;

    case 'sync':
      this._batch(message);
      break;

    default:
      this.emitNext(to, message);
  }
};

Client.prototype.emitNext = function() {
  var args = Array.prototype.slice.call(arguments), self = this;
  immediate(function(){ self.emit.apply(self, args); });
};

Client.prototype._identitySet = function () {
  if (!this.name) {
    this.name = this._uuidV4Generate();
  }

  // Send msg that associates this.id with current name
  var association = { id : this._socket.id, name: this.name };
  var clientVersion = getClientVersion();
  var options = { association: association, clientVersion: clientVersion };

  this.control('clientName').nameSync(options);
}; 

// Variant (by Jeff Ward) of code behind node-uuid, but avoids need for module
var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
Client.prototype._uuidV4Generate = function () {
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
    lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
};

Client.setBackend = function(lib) { eio = lib; };

module.exports = Client;
