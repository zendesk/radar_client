/* globals setImmediate */
var MicroEE = require('microee'),
    eio = require('engine.io-client'),
    Scope = require('./scope.js'),
    StateMachine = require('./state.js'),
    immediate = typeof setImmediate != 'undefined' ? setImmediate :
                                    function(fn) { setTimeout(fn, 1); },
    getClientVersion = require('./client_version.js');

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

Client.prototype.message = function(scope) {
  return new Scope('message:/'+this._configuration.accountName+'/'+scope, this);
};

// Access the "presence" chainable operations
Client.prototype.presence = function(scope) {
  return new Scope('presence:/'+this._configuration.accountName+'/'+scope, this);
};

// Access the "status" chainable operations
Client.prototype.status = function(scope) {
  return new Scope('status:/'+this._configuration.accountName+'/'+scope, this);
};

Client.prototype.stream = function(scope) {
  return new Scope('stream:/'+this._configuration.accountName+'/'+scope, this);
};

Client.prototype.push = function(scope, resource, action, value, callback) {
  return this._write({
    op: 'push',
    to: scope,
    resource: resource,
    action: action,
    value: value
  }, callback);
};

Client.prototype.set = function(scope, value, callback) {
  return this._write({
    op: 'set',
    to: scope,
    value: value,
    key: this._configuration.userId,
    type: this._configuration.userType
  }, callback);
};

Client.prototype.publish = function(scope, value, callback) {
  return this._write({
    op: 'publish',
    to: scope,
    value: value
  }, callback);
};

Client.prototype.subscribe = function(scope, options, callback) {
  var message = { op: 'subscribe', to: scope };
  if (typeof options == 'function') {
    callback = options;
  } else {
    message.options = options;
  }
  return this._write(message, callback);
};

Client.prototype.unsubscribe = function(scope, callback) {
  return this._write({ op: 'unsubscribe', to: scope }, callback);
};

// Sync and get return the actual value of the operation
var init = function(propertyName) {
  Client.prototype[propertyName] = function(scope, options, callback) {
    var message = { op: propertyName, to: scope };
    // options is an optional argument
    if (typeof options == 'function') {
      callback = options;
    } else {
      message.options = options;
    }
    // Sync v1 for presence scopes acts inconsistently. The result should be a
    // "get" message, but it is actually a "online" message.
    // So force v2 and translate the result to v1 format.
    if (propertyName == 'sync' && !message.options && scope.match(/^presence.+/)) {
      message.options = { version: 2 };
      this.when('get', function(message) {
        var value = {}, userId;
        if (!message || !message.to || message.to != scope) {
          return false;
        }

        for (userId in message.value) {
          if (message.value.hasOwnProperty(userId)) {
            // Skip when not defined; causes exception in FF for 'Work Offline'
            if (!message.value[userId]) { continue; }
            value[userId] = message.value[userId].userType;
          }
        }
        message.value = value;
        message.op = 'online';
        if (callback) {
          callback(message);
        }
        return true;
      });
    } else {
      this.when('get', function(message) {
        if (!message || !message.to || message.to != scope) {
          return false;
        }
        if (callback) {
          callback(message);
        }
        return true;
      });
    }
    // sync/get never register or return acks (since they always send back a
    // data message)
    return this._write(message);
  };
};

var props = ['get', 'sync'];
for(var i = 0; i < props.length; i++){
  init(props[i]);
}

// Private API

Client.prototype._addListeners = function () {
  // Add authentication data to a message; _write() emits authenticateMessage
  this.on('authenticateMessage', function(message) {
    if (this._configuration) {
      message.userData = this._configuration.userData;
      if (this._configuration.auth) {
        message.auth = this._configuration.auth;
        message.userId = this._configuration.userId;
        message.userType = this._configuration.userType;
        message.accountName = this._configuration.accountName;
      }
    }
    this.emit('messageAuthenticated', message);
  });

  // Once the message is authenticated, send it to the server
  this.on('messageAuthenticated', function(message) {
    this._sendMessage(message);
  });
};

Client.prototype._write = function(message, callback) {
  var client = this;

  if (callback) {
    message.ack = this._ackCounter++;
    // Wait ack
    this.when('ack', function(m) {
      client.logger().debug('ack', m);
      if (!m || !m.value || m.value != message.ack) {
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
  if (!(message.to && message.value && message.time)) {
    return false;
  }

  var index = 0, data, time,
      length = message.value.length,
      newest = message.time,
      current = this._channelSyncTimes[message.to] || 0;

  for (; index < length; index = index + 2) {
    data = JSON.parse(message.value[index]);
    time = message.value[index + 1];

    if (time > current) {
      this._emitNext(message.to, data);
    }
    if (time > newest) {
      newest = time;
    }
  }
  this._channelSyncTimes[message.to] = newest;
};

Client.prototype._createManager = function() {
  var client = this, manager = this.manager = StateMachine.create();

  manager.on('enterState', function(state) {
    client.emit(state);
  });

  manager.on('event', function(event) {
    client.emit(event);
  });

  manager.on('connect', function(data) {
    var socket = client._socket = new client.backend.Socket(client._configuration);

    socket.once('open', function() {
      client.logger().debug("socket open", socket.id);
      manager.established();
    });

    socket.once('close', function(reason, description) {
      client.logger().debug('socket closed', socket.id, reason, description);
      socket.removeAllListeners('message');
      client._socket = null;

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

    socket.on('message', function(message) {
      client._messageReceived(message);
    });

    manager.removeAllListeners('close');
    manager.once('close', function() {
      socket.close();
    });
  });

  manager.on('activate', function() {
    client._identitySet();
    client._restore();
    client.emit('ready');
  });

  manager.on('authenticate', function() {
    // Can be overridden in order to establish an authentication protocol
    manager.activate();
  });

  manager.on('disconnect', function() {
    client._restoreRequired = true;
  });
};

// Memorize subscriptions and presence states; return "true" for a message that
// adds to the memorized subscriptions or presences
Client.prototype._memorize = function(message) {
  switch(message.op) {
    case 'unsubscribe':
      // Remove from queue
      if (this._subscriptions[message.to]) {
        delete this._subscriptions[message.to];
      }
      return true;
    case 'sync':
    case 'subscribe':
      if (this._subscriptions[message.to] != 'sync') {
        this._subscriptions[message.to] = message.op;
      }
      return true;
    case 'set':
      if (message.to.substr(0, 'presence:/'.length) == 'presence:/') {
        this._presences[message.to] = message.value;
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
  var memorized = this._memorize(message);
  this.emit('message:out', message);

  if (this._socket && this.manager.is('activated')) {
    this._socket.send(JSON.stringify(message));
  } else if (this._isConfigured) {
    this._restoreRequired = true;
    if (!memorized || message.ack) {
      this._queuedMessages.push(message);
    }
    this.manager.connectWhenAble();
  }
};

Client.prototype._messageReceived = function (msg) {
  var message = JSON.parse(msg);
  this.emit('message:in', message);
  switch (message.op) {
    case 'err':
    case 'ack':
    case 'get':
      this._emitNext(message.op, message);
      break;
    case 'sync':
      this._batch(message);
      break;
    default:
      this._emitNext(message.to, message);
  }
};

Client.prototype._emitNext = function() {
  var args = Array.prototype.slice.call(arguments), client = this;
  immediate(function() { client.emit.apply(client, args); });
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

Client.prototype._identitySet = function () {
  var socket = this._socket;
  if (!this.name) {
    this.name = this._uuidV4Generate();
  }

  // Send msg that associates this.id with current name
  var association = { id : socket.id, name: this.name };
  var clientVersion = getClientVersion();
  var message = { op : 'name_id_sync', to: 'control:client_name', value: association,
                                            client_version: clientVersion};
  this._write(message);
};

Client.setBackend = function(lib) { eio = lib; };

module.exports = Client;
