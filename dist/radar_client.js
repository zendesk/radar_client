(function(){function require(e,t){for(var n=[],r=e.split("/"),i,s,o=0;s=r[o++];)".."==s?n.pop():"."!=s&&n.push(s);n=n.join("/"),o=require,s=o.m[t||0],i=s[n+".js"]||s[n+"/index.js"]||s[n];if(s=i.c)i=o.m[t=s][e=i.m];return i.exports||i(i,i.exports={},function(n){return o("."!=n.charAt(0)?n:e+"/../"+n,t)}),i.exports};
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
    Backoff = require('./backoff'),
    Machine = require('sfsm'),
    ONE_HOUR = 60 * 60 * 1000;

function create(client) {
  var connections = 0,
      backoff = new Backoff(),
      machine = Machine.create({
    initial: 'opened',

    error: function() {
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
        log.info('before-' + event + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

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