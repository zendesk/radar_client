(function(){function require(e,t){for(var n=[],r=e.split("/"),i,s,o=0;s=r[o++];)".."==s?n.pop():"."!=s&&n.push(s);n=n.join("/"),o=require,s=o.m[t||0],i=s[n+".js"]||s[n+"/index.js"]||s[n];if(s=i.c)i=o.m[t=s][e=i.m];return i.exports||i(i,i.exports={},function(n){return o("."!=n.charAt(0)?n:e+"/../"+n,t)}),i.exports};
require.m = [];
require.m[0] = { "engine.io-client": { exports: eio },
"lib/backoff.js": function(module, exports, require){function Backoff() {
  this.failures = 0;
}

Backoff.durations = [1000, 2000, 4000, 8000, 16000, 32000]; // seconds (ticks)
Backoff.fallback = 60000;

Backoff.prototype.get = function() {
  return Backoff.durations[this.failures] || Backoff.fallback;
};

Backoff.prototype.increment = function() {
  this.failures++;
};

Backoff.prototype.success = function() {
  this.failures = 0;
};

Backoff.prototype.isUnavailable = function() {
  return Backoff.durations.length <= this.failures;
};

module.exports = Backoff;
},
"lib/client_version.js": function(module, exports, require){// Auto-generated file, overwritten by scripts/add_package_version.js

function getClientVersion() { return '0.14.4'; };

module.exports = getClientVersion;},
"lib/index.js": function(module, exports, require){var Client = require('./radar_client'),
    instance = new Client(),
    Backoff = require('./backoff.js');

instance._log = require('minilog');
instance.Backoff = Backoff;

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance;
},
"lib/message.js": function(module, exports, require){var logger = require('minilog')('radar:message');

var message_op_matrix = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync']
};

function Message (op, to) {
  return {
    op : op,
    to : to
  };
}

// Return the array of operations that are valid for a message type
Message.getOpsForMessageType = function (type) {
  return message_op_matrix[type];
};

// Return message objects corresponding to the radar message specification V2

Message.requestGet = function (scope, options) {
  if (scope)
  {
    var message = Message('get', scope);
    Message.setOptions(message, options);

    return message;
  }
};

// options are required
Message.requestNameSync = function (scope, options) {
  if (scope && options)
  {
    var message = Message('nameSync', scope);
    message.options = options;

    return message;
  }
};

Message.requestPublish = function (scope, value) {
  if (scope && value) {
    var message = Message('publish', scope);
    message.value = value;

    return message;
  }
};

Message.requestPush = function (scope, resource, action, value) {
  if (scope && resource && action && value) {
    var message = Message('push', scope);
    message.resource = resource;
    message.action = action;
    message.value = value;

    return message;
  }
};

Message.requestSet = function (scope, value, key, type) {
  //if (scope && value && key && type) {
    var message = Message('set', scope);
    message.value = value;
    message.key = key;
    message.type = type;

    return message;
  //}
};

Message.requestSubscribe = function (scope, options) {
  var message = Message('subscribe', scope);
  Message.setOptions(message, options);

  return message;
};

Message.requestSync = function (scope, options) {
  var message = Message('sync', scope);
  Message.setOptions(message, options);
  
  return message;
};

Message.requestUnsubscribe = function (scope) {
  var message = Message('unsubscribe', scope);

  return message;
};

Message.setOptionsVersion = function (message, version) {
  if (message) {
    if (message.options) {
      message.options.version = version;
    } else {
      message.options = { version: version };
    }
  }
};

Message.setOptions = function (message, options) {
  if (options && typeof options != 'function') {
    message.options = options;
  }
};

Message.isOptionsSet = function (message) {
  return (message && !!message.options);
};

Message.isValidScope = function (message, scope) {
  return message && message.to && message.to === scope;
};

Message.requestForceV2Presence = function (message, scope) {
  // Sync v1 for presence scopes acts inconsistently. The result should be a
  // "get" message, but it is actually a "online" message.
  // So force v2 and translate the result to v1 format.
  ///message.options = message.options || { version : 2 };
  var value = {}, userId;
  for (userId in message.value) {
    if (message.value.hasOwnProperty(userId)) {
      // Skip when not defined; causes exception in FF for 'Work Offline'
      if (!message.value[userId]) { continue; }
      value[userId] = message.value[userId].userType;
    }
  }
  message.value = value;
  message.op = 'online';
};

Message.setAck = function (message, ack) {
  if (message && ack) {
    message.ack = ack;
  }
};

Message.getAck = function (message) {
  return (message && message.ack);
};

Message.isValidAck = function (responseMessage, requestMessage) {
  var valid = responseMessage && responseMessage.value &&
              responseMessage.value === requestMessage.ack;

  return valid;
};

Message.getOp = function (message) {
  return (message && message.op);
};

Message.getTo = function (message) {
  return (message && message.to);
};

Message.getValue = function (message) {
  return (message && message.value);
};

Message.getTime = function (message) {
  return (message && message.time);
};

// TO DO: config class should return the required data via getters
Message.setUserData = function (message, configuration) {
  message.userData = configuration && configuration.userData;
};

// TO DO: config class should return the required data via getters
Message.setAuthData = function (message, configuration) {
  if (configuration && configuration.auth) {
    message.auth = configuration.auth;
    message.userId = configuration.userId;
    message.userType = configuration.userType;
    message.accountName = configuration.accountName;
  }
};

module.exports = Message;
},
"lib/radar_client.js": function(module, exports, require){/* globals setImmediate */
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
},
"lib/scope.js": function(module, exports, require){var Message = require('./message.js');

function Scope(prefix, client) {
  this.prefix = prefix;
  this.client = client;
}

var props = [ 'set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync'];

var init = function (name) {
  Scope.prototype[name] = function () {
    var message_type = this.prefix.substring(0, this.prefix.indexOf(':'));
    var valid_ops = Message.getOpsForMessageType(message_type);

    if (valid_ops.indexOf(name) >= 0) {
      var args = Array.prototype.slice.apply(arguments);
      args.unshift(this.prefix);
      this.client[name].apply(this.client, args);
      return this;
    }
  };
};

for (var i = 0; i < props.length; i++){
  init(props[i]);
}

module.exports = Scope;
},
"lib/state.js": function(module, exports, require){var log = require('minilog')('radar_state'),
    MicroEE = require('microee'),
    Backoff = require('./backoff'),
    Machine = require('sfsm');

function create() {
  var backoff = new Backoff(),
      machine = Machine.create({

    error: function(name, from ,to, args, type, message, err) {
      log.warn('state-machine-error', arguments);

      if (err) {
        throw err;
      }
    },

    events: [
      { name: 'connect',       from: [ 'opened', 'disconnected' ], to: 'connecting' },
      { name: 'established',   from: 'connecting', to: 'connected' },
      { name: 'authenticate',  from: 'connected', to: 'authenticating' },
      { name: 'activate',      from: [ 'authenticating', 'activated' ], to: 'activated' },
      { name: 'disconnect',    from: Machine.WILDCARD, to: 'disconnected' },
      { name: 'close',         from: Machine.WILDCARD, to: 'closed' },
      { name: 'open',          from: [ 'none', 'closed' ], to: 'opened' }
    ],

    callbacks: {
      onevent: function(event, from, to) {
        log.debug('before-' + event + ', from: ' + from + ', to: ' + to,
                                    Array.prototype.slice.call(arguments));

        this.emit('event', event);
        this.emit(event, arguments);
      },

      onstate: function(event, from, to) {
        log.debug('event-state-' + event + ', from: ' + from + ', to: ' + to,
                                    Array.prototype.slice.call(arguments));

        this.emit('enterState', to);
        this.emit(to, arguments);
      },

      onconnecting: function() {
        this.startGuard();
      },

      onestablished: function() {
        this.cancelGuard();
        backoff.success();
        this.authenticate();
      },

      onclose: function() {
        this.cancelGuard();
      },

      ondisconnected: function(event, from, to) {
        backoff.increment();

        if (this._timer) {
          clearTimeout(this._timer);
          delete this._timer;
        }

        var time = backoff.get();
        log.debug("reconnecting in " + time + "msec");
        this._timer = setTimeout(function() {
          delete machine._timer;
          if (machine.is('disconnected')) {
            machine.connect();
          }
        }, time);

        if (backoff.isUnavailable()) {
          log.info("unavailable");
          this.emit('unavailable');
        }
      }
    }
  });

  // For testing
  machine._backoff = backoff;
  machine._connectTimeout = 10000;

  for (var property in MicroEE.prototype) {
    if (MicroEE.prototype.hasOwnProperty(property)) {
      machine[property] = MicroEE.prototype[property];
    }
  }

  machine.open();

  machine.start = function() {
    if (this.is('closed')) {
      this.open();
    }

    if (this.is('activated')) {
      this.activate();
    } else {
      this.connectWhenAble();
    }
  };

  machine.startGuard = function() {
    machine.cancelGuard();
    machine._guard = setTimeout(function() {
      log.info("startGuard: disconnect from timeout");
      machine.disconnect();
    }, machine._connectTimeout);
  };

  machine.cancelGuard = function() {
    if (machine._guard) {
      clearTimeout(machine._guard);
      delete machine._guard;
    }
  };

  machine.connectWhenAble = function() {
    if (!(this.is('connected') || this.is('activated'))) {
      if (this.can('connect')) {
        this.connect();
      } else {
        this.once('enterState', function() {
          machine.connectWhenAble();
        });
      }
    }
  };

  return machine;
}

module.exports = { create: create };

},
"microee": {"c":1,"m":"/index.js"},
"minilog": { exports: Minilog },
"sfsm": {"c":2,"m":"/state-machine.js"}};
require.m[1] = { "/index.js": function(module, exports, require){function M() { this._events = {}; }
M.prototype = {
  on: function(ev, cb) {
    this._events || (this._events = {});
    var e = this._events;
    (e[ev] || (e[ev] = [])).push(cb);
    return this;
  },
  removeListener: function(ev, cb) {
    var e = this._events[ev] || [], i;
    for(i = e.length-1; i >= 0 && e[i]; i--){
      if(e[i] === cb || e[i].cb === cb) { e.splice(i, 1); }
    }
  },
  removeAllListeners: function(ev) {
    if(!ev) { this._events = {}; }
    else { this._events[ev] && (this._events[ev] = []); }
  },
  listeners: function(ev) {
    return (this._events ? this._events[ev] || [] : []);
  },
  emit: function(ev) {
    this._events || (this._events = {});
    var args = Array.prototype.slice.call(arguments, 1), i, e = this._events[ev] || [];
    for(i = e.length-1; i >= 0 && e[i]; i--){
      e[i].apply(this, args);
    }
    return this;
  },
  when: function(ev, cb) {
    return this.once(ev, cb, true);
  },
  once: function(ev, cb, when) {
    if(!cb) return this;
    function c() {
      if(!when) this.removeListener(ev, c);
      if(cb.apply(this, arguments) && when) this.removeListener(ev, c);
    }
    c.cb = cb;
    this.on(ev, c);
    return this;
  }
};
M.mixin = function(dest) {
  var o = M.prototype, k;
  for (k in o) {
    o.hasOwnProperty(k) && (dest.prototype[k] = o[k]);
  }
};
module.exports = M;
}};
require.m[2] = { "/state-machine.js": function(module, exports, require){/*

  Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine

  Copyright (c) 2012, 2013 Jake Gordon and contributors
  Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE

*/

var StateMachine = StateMachine = module.exports = {

    //---------------------------------------------------------------------------

    VERSION: '2.2.0',

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED:    1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
      PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function(cfg, target) {

      var initial   = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var terminal  = cfg.terminal || cfg['final'];
      var fsm       = target || cfg.target  || {};
      var events    = cfg.events || [];
      var callbacks = cfg.callbacks || {};
      var map       = {};
      var name;

      var add = function(e) {
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0 ; n < from.length ; n++)
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for(var n = 0 ; n < events.length ; n++)
        add(events[n]);

      for(name in map) {
        if (map.hasOwnProperty(name))
          fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for(name in callbacks) {
        if (callbacks.hasOwnProperty(name))
          fsm[name] = callbacks[name];
      }

      fsm.current = 'none';
      fsm.is      = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
      fsm.can     = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); };
      fsm.cannot  = function(event) { return !this.can(event); };
      fsm.error   = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

      fsm.isFinished = function() { return this.is(terminal); };

      if (initial && !initial.defer)
        fsm[initial.event]();

      return fsm;

    },

    //===========================================================================

    doCallback: function(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        }
        catch(e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, 'an exception occurred in a caller-provided callback function', e);
        }
      }
    },

    beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm.onbeforeevent,                       name, from, to, args); },
    afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm.onafterevent || fsm.onevent,      name, from, to, args); },
    leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm.onleavestate,                        name, from, to, args); },
    enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm.onenterstate || fsm.onstate,      name, from, to, args); },
    changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm.onchangestate,                       name, from, to, args); },

    beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },

    beforeEvent: function(fsm, name, from, to, args) {
      if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||
          (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))
        return false;
    },

    afterEvent: function(fsm, name, from, to, args) {
      StateMachine.afterThisEvent(fsm, name, from, to, args);
      StateMachine.afterAnyEvent( fsm, name, from, to, args);
    },

    leaveState: function(fsm, name, from, to, args) {
      var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
          general  = StateMachine.leaveAnyState( fsm, name, from, to, args);
      if ((false === specific) || (false === general))
        return false;
      else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))
        return StateMachine.ASYNC;
    },

    enterState: function(fsm, name, from, to, args) {
      StateMachine.enterThisState(fsm, name, from, to, args);
      StateMachine.enterAnyState( fsm, name, from, to, args);
    },

    //===========================================================================

    buildEvent: function(name, map) {
      return function() {

        var from  = this.current;
        var to    = map[from] || map[StateMachine.WILDCARD] || from;
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition)
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, 'event ' + name + ' inappropriate because previous transition did not complete');

        if (this.cannot(name))
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, 'event ' + name + ' inappropriate in current state ' + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args))
          return StateMachine.Result.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.Result.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function() {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState( fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent( fsm, name, from, to, args);
          return StateMachine.Result.SUCCEEDED;
        };
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        };

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.Result.CANCELLED;
        }
        else if (StateMachine.ASYNC === leave) {
          return StateMachine.Result.PENDING;
        }
        else {
          if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
            return this.transition();
        }

      };
    }

  }; // StateMachine
}};
RadarClient = require('lib/index.js');
}());