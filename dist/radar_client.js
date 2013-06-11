(function(){function require(e,t){for(var n=[],r=e.split("/"),i,s,o=0;s=r[o++];)".."==s?n.pop():"."!=s&&n.push(s);n=n.join("/"),o=require,s=o.m[t||0],i=s[n+".js"]||s[n+"/index.js"]||s[n],r='Cannot require("'+n+'")';if(!i)throw Error(r);if(s=i.c)i=o.m[t=s][e=i.m];if(!i)throw Error(r);return i.exports||i(i,i.exports={},function(n){return o("."!=n.charAt(0)?n:e+"/../"+n,t)}),i.exports};
require.m = [];
require.m[0] = { "engine.io-client": { exports: window.eio },
"lib/backoff.js": function(module, exports, require){function Backoff() {
  this.failures = 0;
}

Backoff.durations = [1000, 2000, 4000, 8000, 16000, 32000]; // seconds (ticks)

Backoff.prototype.get = function() {
  return Backoff.durations[this.failures] || 60000;
};

Backoff.prototype.increment = function() {
  this.failures++;
};

Backoff.prototype.success = function() {
  this.failures = 0;
};

Backoff.prototype.unavailable = function() {
  return Backoff.durations.length >= this.failures;
};

module.exports = Backoff;
},
"lib/index.js": function(module, exports, require){var Client = require('./radar_client'),
    instance = new Client();

instance._log = require('minilog');

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance;
},
"lib/radar_client.js": function(module, exports, require){var log = require('minilog')('radar_client'),
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
},
"lib/reconnector.js": function(module, exports, require){var log = require('minilog')('radar_reconnect');

function Reconnector(client) {
  this.subscriptions = {};
  this.presences = {};
  this.mqueue = [];
  this.client = client;
  this.waitCounter = 0;
}

Reconnector.prototype.memorize = function(message) {
  switch(message.op) {
    case 'unsubscribe':
      // remove from queue
      if(this.subscriptions[message.to]) {
        delete this.subscriptions[message.to];
      }
      break;
    case 'sync':
    case 'subscribe':
      if(this.subscriptions[message.to] != 'sync') {
        this.subscriptions[message.to] = message.op;
      }
      break;
    case 'set':
      if (message.to.substr(0, 'presence:/'.length) == 'presence:/') {
        this.presences[message.to] = message.value;
      }
      break;
  }
};

Reconnector.prototype.queue = function(message) {
  log.info('Queue message', message);
  this.mqueue.push(message);
};

Reconnector.prototype.restore = function(done) {
  var self = this, total = 0, to, message;

  function ack() {
    self.waitCounter--;
    if(self.waitCounter === 0) {
      done();
    }
  }
  log.info({ event: 'restore-subscriptions' });
  for (to in this.subscriptions) {
    if (!this.subscriptions.hasOwnProperty(to)) { continue; }
    var item = this.subscriptions[to];
    this.waitCounter++;
    total++;
    this.client[item](to, ack);
  }

  for (to in this.presences) {
    if (!this.presences.hasOwnProperty(to)) { continue; }
    this.waitCounter++;
    total++;
    this.client.set(to, this.presences[to], ack);
  }
  message = this.mqueue.shift();
  while(message) {
    this.client.manager._sendPacket(JSON.stringify(message));
    message = this.mqueue.shift();
  }
  // if we didn't do anything, just trigger done()
  if(total === 0) {
    done();
  }
};

module.exports = Reconnector;
},
"lib/scope.js": function(module, exports, require){function Scope(prefix, client) {
  this.prefix = prefix;
  this.client = client;
}

var props = [ 'set', 'get', 'subscribe', 'unsubscribe', 'publish', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners'];

var init = function(name) {
  Scope.prototype[name] = function () {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(this.prefix);
    this.client[name].apply(this.client, args);
    return this;
  };
};

for(var i = 0; i < props.length; i++){
  init(props[i]);
}

module.exports = Scope;
},
"lib/state.js": function(module, exports, require){var log = require('minilog')('radar_state'),
    Reconnector = require('./reconnector'),
    MicroEE = require('microee'),
    Backoff = require('./backoff'),
    Machine = require('sfsm'),
    ONE_HOUR = 60 * 60 * 1000;

function create(client) {
  var connections = 0,
      backoff = new Backoff(),
      machine = Machine.create({
    initial: 'opened',

    error: function() {
      console.error(arguments);
      log.error('state-machine-error', arguments);
    },

    events: [
      { name: 'configure',     from: [ 'opened', 'connected', 'ready' ], to: 'configured' },
      { name: 'connect',       from: [ 'opened', 'configured', 'disconnected' ], to: 'connecting' },
      { name: 'established',   from: 'connecting', to: 'connected' },
      { name: 'authenticate',  from: 'connected', to: 'authenticating' },
      { name: 'ready',         from: [ 'authenticating', 'ready' ], to: 'ready' },
      { name: 'disconnect',    from: [ 'connecting', 'connected', 'authenticating', 'ready', 'disconnected' ], to: 'disconnected' },
      { name: 'close',         from: [ 'opened', 'configured', 'disconnected', 'connecting', 'connected', 'authenticating', 'ready', 'closed' ], to: 'closed' },
      { name: 'open',          from: 'closed', to: 'opened' }
    ],

    callbacks: {
      onbeforeevent: function(event, from, to) {
        log.info('before-' + event + ' from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        var listeners = machine.listeners[event], i, l;
        if (listeners) {
          for (i = 0, l = listeners.length; i < l; ++i) {
            listeners[i].call(machine);
          }
        }
      },

      onconfigure: function(event, from, to, configuration) {
        client.removeAllListeners('messageAuthenticated');
        client.on('messageAuthenticated', function(message) {
          machine.sendAuthenticatedMessage(message);
        });

        client.removeAllListeners('authenticated');
        client.on('authenticated', function() {
          machine.ready();
        });

        machine.configuration = configuration;

        if (!machine.is('connected') || !machine.is('ready') || !machine.is('connecting')) {
          machine.connect();
        }
      },

      onconnecting: function() {
        machine.cancelGuard();

        var socket = machine.socket = client.createSocket();

        socket.once('open', function () {
          machine.established();
        });

        socket.on('message', function(message) {
          client.messageReceived(message);
        });

        socket.once('close', function() {
          if (!machine.is('closed')) {
            machine.disconnect(false);
          }
        });

        machine.startGuard();
      },

      onestablished: function() {
        machine.cancelGuard();

        machine.authenticate();
        backoff.success();
        client.connected();
      },

      onauthenticate: function() {
        client.authenticate();
      },

      onready: function(event, from, to) {
        client.ready();

        if (machine.list && machine.list.length) {
          var item, i = 0, length = machine.list.length, oneHourAgo = new Date() - ONE_HOUR;
          for (; i < length; ++i) {
            item = machine.list[i];
            // dont't send messages that are over an hour old
            if (item && item._date > oneHourAgo) {
              machine.send(item);
            }
          }
          machine.list = machine.list.slice(length);
        }
      },

      ondisconnect: function(event, from, to, permanent) {
        if (!permanent) {
          backoff.increment();
          machine.connect();

          if (backoff.unavailable()) {
            client.unavailable();
          }
        }

        client.disconnected(permanent);
      },

      onafterclose: function(event, from, to, socketClosed) {
        if (!socketClosed && machine.socket) {
          machine.socket.close();
          client.disconnected(true);
        }
      }
    }
  });

  machine.start = function() {
    if (this.is('closed')) {
      this.open();
    }

    if (this.is('ready')) {
      client.ready();
    }
  };

  machine.queueLimit = 100;

  machine.queue = function(message) {
    message._date = new Date();
    this.list = this.list || [];

    // limit the number of messages that can be queue
    if (this.list.length > this.queueLimit) {
      this.list = this.list.slice(this.list.length - this.queueLimit);
    }

    return this.list.push(message);
  };

  machine.startGuard = function() {
    machine._guard = setTimeout(function() {
      machine.disconnect(false);
    }, machine.guardDelay());
  };

  machine.cancelGuard = function() {
    if (machine._guard) {
      clearTimeout(machine._guard);
      delete machine._guard;
    }
  };

  machine.guardDelay = function() {
    return backoff.get() + 6000;
  };

  machine.send = function(message) {
    if (this.is('ready')) {
      return client.authenticateMessage(message);
    // only queue after the machine has been configured
    } else if (this.configuration) {
      if (this.can('connect')) {
        this.connect();
      }

      return this.queue(message);
    }

    return false;
  };

  machine.sendAuthenticatedMessage = function(message) {
    this.socket.sendPacket('message', JSON.stringify(message));

    message.direction = 'out';
    log.info(message);
  };

  return machine;
}

module.exports = { create: create };
/*
function StateMachine() {
  var self = this;
  this.connections = 0;
  this._state = StateMachine.states.stopped;
  this.socket = null;
  this.queue = [];
  this.transitionTimer = null;
  this.socketConfig = null;
  this.guard = null;
  this.backoff = new Backoff();
  this._timeout = null;

  // set sink, createSocket and handleMessage after creating the state machine
  this.sink = new MicroEE();
  this.createSocket = null;
  this.handleMessage = null;
  this.reconnector = null;
  this.waitingForConfig = false;
  // audit trail
  this.auditSent = 0;
  this.auditReceived = 0;
}

// Map of states
var states = StateMachine.states = {
  permanently_disconnected: -2, // service unavailable or config error
  // Disconnect states
  stopped: -1, // disconnected and not looking to connect
  waiting: 1, // waiting to reconnect, exponential backoff
  reconnect: 2, // disconnected for reason other than explicit disconnect()
  disconnecting: 3, // actively transitioning to "stopped" state
  // Connect states
  connecting: 4, // actively transitioning to "connected" state
  connected: 5, // connected but still need to resync etc.
  ready: 6 // connected and any lost subs/syncs re-established
};

StateMachine.prototype.set = function(to) {
  if(typeof to !== 'undefined') {
    log.debug({ op: 'change-state', from: this._state, to: to });
    this._state = to;
  }
};

StateMachine.prototype.configure = function(sink, config) {
  config || (config = {});
  config.upgrade = false;
  this.socketConfig = config;
  sink && (this.sink = sink);
  if(this.waitingForConfig && this._state == states.stopped) {
    this.waitingForConfig = false;
    this.connect();
  }
};

StateMachine.prototype.connect = function() {
  if(this._state == states.stopped && this.socketConfig) {
    this.reconnector = new Reconnector(this.sink);
    // you can only start if you've stopped. Other states have a defined transition path.
    this.set(states.reconnect);
  } else {
    this.waitingForConfig = true;
  }
  this.run();
};

// StateMachine manages sending messages, because it can easily handle connecting on demand
StateMachine.prototype.send = function(message) {
  if(this._state < 0) {
    // ignore calls when not configured and not connected
    if(!this.socketConfig || !this.sink) return;
    // otherwise connect automatically
    this.connect();
  }
  // memorize if necessary
  this.reconnector.memorize(message);
  if(this._state < 5) {
    this.reconnector.queue(message);
  } else {
    this._sendPacket(JSON.stringify(message));
    message.direction = 'out';
    log.info(message);
  }
};

StateMachine.prototype._sendPacket = function(data){
  this.auditSent++;
  this.socket.sendPacket('message', data);
};

StateMachine.prototype.disconnect = function() {
  var self = this;
  log.info({ op: 'explicit-disconnect' });
  if(!this.socketConfig) {
    this.waitingForConfig = false;
    return;
  }
  this.set(states.disconnecting);
  if(this.socket) {
    // clear listeners
    this.socket.removeAllListeners('close');
    // stop
    this.socket.on('close', function() {
      self.set(states.stopped);
    });
    this.socket.close();
  }
  this.run();
};

// never directly called. Everything goes through the state machine
StateMachine.prototype._connect = function() {
  if(this._state != states.reconnect) {
    log.error('Connect is only allowed from reconnecting state!');
    return;
  }
  var self = this;
  // reconnect, guard against duplicate connections if a connect attempt is already on the way
  var socket = this.socket = this.createSocket(this.socketConfig);
  this.auditSent = 0;
  this.auditReceived = 0;
  socket.once('open', function () {
    self.set(states.connected);
    self.run();
  });
  socket.on('message', this.handleMessage);
  socket.on('message', function() {
    self.auditReceived++;
  });
  socket.once('close', function() { self.handleDisconnect(); });

  this._startGuard(function() {
    log.warn({ event: 'connection-guard-timeout' });
    self.handleDisconnect();
  }, this.backoff.get() + 6000);
  this.set(states.connecting);
};

StateMachine.prototype.handleDisconnect = function() {
  // exponential backoff
  this._cancelGuard();
  this.backoff.increment();
  this.set(states.reconnect);
  if(this.backoff.get() > 9000000) {
    this.set(states.permanently_disconnected);
    this.retransition(1000);
  } else {
    this.retransition(this.backoff.get());
  }
  this.sink.emit('disconnected');
  log.info({ event: 'disconnected', wait: this.backoff.get() });
};

StateMachine.prototype.run = function() {
  var self = this,
      s = StateMachine.states;

  if(this.socketConfig){
    log.debug({ op: 'run-state', state: this._state });
  }

  switch(this._state) {
    case s.permanently_disconnected:
      this.sink.emit('unavailable');
      break;
    case s.stopped:
      this.sink.emit('disconnected');
      break;
    case s.waiting:

      break;
    case s.reconnect:
      this._connect(this.socketConfig);
      break;
    case s.disconnecting:
    case s.connecting:
      // if we are connecting/disconnecting, set a timeout to check again later
      this.retransition(1000);
      break;
    case s.connected:
      this._cancelGuard();
      this.reconnector.restore(function() {
        self.set(s.ready);
        self.run();
      });
      break;
    case s.ready:
      this.connections++;
      this.backoff.success();
      if(this.connections == 1) {
        this.sink.emit('connected');
      } else {
        this.sink.emit('reconnected');
      }
      this.sink.emit('ready');
      break;
  }
};

StateMachine.prototype.retransition = function(timeout) {
    var self = this;
    this._timeout = timeout;
    if(!this.transitionTimer) {
      this.transitionTimer = setTimeout(function() {
        self.transitionTimer = null;
        log.info('Ran transition after', timeout);
        self.run();
      }, timeout);
    }
};

StateMachine.prototype._startGuard = function(callback, timeout) {
  log.debug({ event: 'start guard', timeout: timeout });
  this.guard && clearTimeout(this.guard);
  this.guard = setTimeout(callback, timeout);
};

StateMachine.prototype._cancelGuard = function() {
  log.debug({ event: 'cancel-guard' });
  this.guard && clearTimeout(this.guard);
};

StateMachine._setTimeout = function(fn) {
  setTimeout = fn;
};

module.exports = StateMachine;
//*/
},
"microee": {"c":1,"m":"/index.js"},
"minilog": { exports: window.Minilog }};
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
RadarClient = require('lib/index.js');
}());