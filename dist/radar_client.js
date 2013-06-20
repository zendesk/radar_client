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

Backoff.prototype.isUnavailable = function() {
  return Backoff.durations.length <= this.failures;
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
  this._ackCounter = 1;
  this._channelSyncTimes = {};
  this._users = {};

  // allow backend substitution for tests
  this.backend = backend || eio;

  this._createManager();
  this.configure(false);

  this.on('authenticateMessage', function(message) {
    if(this._configuration && this._configuration.auth) {
      message.auth = this._configuration.auth;
      message.userId = this._configuration.userId;
      message.userType = this._configuration.userType;
      message.accountName = this._configuration.accountName;
    }
    this.emit('messageAuthenticated', message);
  });

  this.on('messageAuthenticated', function(message) {
    this._sendMessage(message);
  });
}

MicroEE.mixin(Client);

// alloc() and dealloc() rather than connect() and disconnect() - see readme.md
Client.prototype.alloc = function(name, callback) {
  log.info({ op: 'alloc', name: name });
  var self = this;
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
    if(this._users.hasOwnProperty(key)) {
      count = 1;
      break;
    }
  }
  if(count < 1) {
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

  if (hash !== false) {
    this.manager.configure(this._configuration);
  }
  return this;
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
  if(callback) {
    message.ack = this._ackCounter++;
    // wait ack
    this.when('ack', function(m) {
      if(!m || !m.value || m.value != message.ack) { return false; }
      callback(message);
      return true;
    });
  }
  this.emit('authenticateMessage', message);
  return this;
};

Client.prototype._batch = function(message) {
  if(!(message.to && message.value && message.time)) { return false; }

  var index = 0, data, time,
      length = message.value.length,
      newest = message.time,
      current = this._channelSyncTimes[message.to] || 0;

  for(; index < length; index = index + 2) {
    data = JSON.parse(message.value[index]);
    time = message.value[index + 1];

    if(time > current) {
      this.emit(message.to, data);
    }
    if(time > newest) {
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

    socket.on('open', function() {
      if (manager.can('established')) {
        manager.established();
      }
    });

    socket.once('close', function() {
      manager.close();
    });

    socket.on('message', function(message) {
      client._messageReceived(message);
    });
  });

  manager.on('activate', function() {
    client.emit('ready');
    if (client._queuedMessages && client._queuedMessages.length) {
      eachSlice(client._queuedMessages, 5, function(messages) {
        client._batchSend(messages);
      });
    }
  });

  manager.on('authenticate', function() {
    // can be overridden in order to establish an authentication protocol
    manager.activate();
  });
};

Client.prototype._batchSend = function(messages) {
  var client = this;
  setTimeout(function() {
    eachSlice(messages, 1, function(messages) {
      client._write(messages[0]);
    });
  }, 10);
};

Client.prototype._sendMessage = function(message) {
  if (this._socket && this.manager.is('activated')) {
    this._socket.sendPacket('message', JSON.stringify(message));
  } else if (this.manager.hasBeen('configured')) {
    this._queue(message);
    this.manager.connectWhenAble();
  }
};

Client.prototype._queue = function(message) {
  this._queuedMessages = this._queuedMessages || [];
  this._queuedMessages.unshift(message);
};

Client.prototype._messageReceived = function (msg) {
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

Client.setBackend = function(lib) { eio = lib; };

function eachSlice(array, size, callback) {
  var slice, begin = 0, end = size, length = array.length;

   while (begin < length) {
    slice = array.slice(begin, end);
    if (false === callback.call(array, slice, begin, end)) {
      return;
    }
    begin = end;
    end += size;
  }
}

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
    MicroEE = require('microee'),
    Backoff = require('./backoff'),
    Machine = require('sfsm');

function create() {
  var backoff = new Backoff(),
      machine = Machine.create({

    error: function(name, from ,to, args, type, message, err) {
      log.warn('state-machine-error', arguments);
    },

    events: [
      { name: 'configure',     from: Machine.WILDCARD, to: 'configured' },
      { name: 'connect',       from: [ 'configured', 'disconnected' ], to: 'connecting' },
      { name: 'established',   from: 'connecting', to: 'connected' },
      { name: 'authenticate',  from: 'connected', to: 'authenticating' },
      { name: 'activate',      from: [ 'authenticating', 'activated' ], to: 'activated' },
      { name: 'disconnect',    from: Machine.WILDCARD, to: 'disconnected' },
      { name: 'close',         from: Machine.WILDCARD, to: 'closed' },
      { name: 'open',          from: [ 'none', 'closed' ], to: 'opened' }
    ],

    callbacks: {
      onevent: function(event, from, to) {
        log.debug('before-' + event + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        this.emit('event', event);
        this.emit(event, arguments);
      },

      onstate: function(state, from, to) {
        this.previousStates = this.previousStates || [];
        this.previousStates.push(from);

        log.debug('state-' + state + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        this.emit('enterState', state);
        this.emit(state, arguments);
      },

      onconfigure: function() {
        if (this.can('connect')) {
          this.connect();
        } else {
          return false;
        }
      },

      onconnect: function() {
        this.startGuard();
      },

      onestablished: function() {
        this.cancelGuard();
        backoff.success();
        this.authenticate();
      },

      ondisconnect: function(event, from, to, permanent) {
        if (!permanent) {
          backoff.increment();
          this.connect();
        }

        if (backoff.isUnavailable()) {
          this.emit('unavailable');
        }
      },

      onclose: function(event, from, to, socketClosed) {
        this.emit('close');
      }
    }
  });

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

  machine.hasBeen = function(state) {
    if (this.previousStates.indexOf) {
      return this.previousStates.indexOf(state) > -1;
    }

    for (var index = 0, length = this.previousStates.length; index < length; ++index) {
      if (this.previousStates[index] == state) {
        return true;
      }
    }

    return false;
  };

  machine.connectWhenAble = function() {
    if (!this.is('connected')) {
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