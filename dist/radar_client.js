(function(){
var r=function(){var e="function"==typeof require&&require,r=function(i,o,u){o||(o=0);var n=r.resolve(i,o),t=r.m[o][n];if(!t&&e){if(t=e(n))return t}else if(t&&t.c&&(o=t.c,n=t.m,t=r.m[o][t.m],!t))throw new Error('failed to require "'+n+'" from '+o);if(!t)throw new Error('failed to require "'+i+'" from '+u);return t.exports||(t.exports={},t.call(t.exports,t,t.exports,r.relative(n,o))),t.exports};return r.resolve=function(e,n){var i=e,t=e+".js",o=e+"/index.js";return r.m[n][t]&&t?t:r.m[n][o]&&o?o:i},r.relative=function(e,t){return function(n){if("."!=n.charAt(0))return r(n,t,e);var o=e.split("/"),f=n.split("/");o.pop();for(var i=0;i<f.length;i++){var u=f[i];".."==u?o.pop():"."!=u&&o.push(u)}return r(o.join("/"),t,e)}},r}();r.m = [];
r.m[0] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
"sfsm": {"c":4,"m":"state-machine.js"},
"microee": {"c":5,"m":"index.js"},
"radar_message": {"c":6,"m":"lib/index.js"},
"index.js": function(module, exports, require){
var Client = require('./radar_client'),
    instance = new Client(),
    Backoff = require('./backoff.js');

instance._log = require('minilog');
instance.Backoff = Backoff;

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance;

},
"scope.js": function(module, exports, require){
function Scope(typeName, scope, client) {
  this.client = client;
  this.prefix = this._buildScopePrefix(typeName, scope, client.configuration('accountName'));
}

var props = [ 'set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync'];

var init = function (name) {
  Scope.prototype[name] = function () {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(this.prefix);
    this.client[name].apply(this.client, args);
    return this;
  };
};

for (var i = 0; i < props.length; i++) {
  init(props[i]);
}

Scope.prototype._buildScopePrefix = function (typeName, scope, accountName) {
  return typeName + ':/' + accountName + '/' + scope;
};

module.exports = Scope;

},
"state.js": function(module, exports, require){
var log = require('minilog')('radar_state'),
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
"backoff.js": function(module, exports, require){
function Backoff() {
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
"radar_client.js": function(module, exports, require){
/* globals setImmediate */
var MicroEE = require('microee'),
    eio = require('engine.io-client'),
    Scope = require('./scope.js'),
    StateMachine = require('./state.js'),
    immediate = typeof setImmediate != 'undefined' ? setImmediate :
                                    function(fn) { setTimeout(fn, 1); },
    getClientVersion = require('./client_version.js'),
    Request = require('radar_message').Request,
    Response = require('radar_message').Response;

function Client(backend) {
  var self = this;
  this.logger = require('minilog')('radar_client');
  this._ackCounter = 1;
  this._channelSyncTimes = {};
  this._uses = {};
  this._presences = {};
  this._subscriptions = {};
  this._restoreRequired = false;
  this._queuedRequests = [];
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

// Return the chainable scope object for a given message type

Client.prototype.message = function(scope) {
  return new Scope('message', scope, this);
};

Client.prototype.presence = function(scope) {
  return new Scope('presence', scope, this);
};

Client.prototype.status = function(scope) {
  return new Scope('status', scope, this);
};

Client.prototype.stream = function(scope) {
  return new Scope('stream', scope, this);
};

Client.prototype.control = function(scope) {
  return new Scope('control', scope, this);
};

// Operations

Client.prototype.nameSync = function(scope, options, callback) {
  var request = Request.buildNameSync(scope, options);
  return this._write(request, callback);
};

Client.prototype.push = function(scope, resource, action, value, callback) {
  var request = Request.buildPush(scope, resource, action, value);
  return this._write(request, callback);
};

Client.prototype.set = function(scope, value, clientData, callback) {
  var request;

  callback = _chooseFunction(clientData, callback);
  clientData = _nullIfFunction(clientData);

  request = Request.buildSet(scope, value,
                  this._configuration.userId, this._configuration.userType,
                  clientData);

  return this._write(request, callback);
};

Client.prototype.publish = function(scope, value, callback) {
  var request = Request.buildPublish(scope, value);
  return this._write(request, callback);
};

Client.prototype.subscribe = function(scope, options, callback) {
  callback = _chooseFunction(options, callback);
  options = _nullIfFunction(options);

  var request = Request.buildSubscribe(scope, options);

  return this._write(request, callback);
};

Client.prototype.unsubscribe = function(scope, callback) {
  var request = Request.buildUnsubscribe(scope);
  return this._write(request, callback);
};

// sync returns the actual value of the operation
Client.prototype.sync = function (scope, options, callback) {
  var request, onResponse, v1Presence;

  callback = _chooseFunction(options, callback);
  options = _nullIfFunction(options);

  request = Request.buildSync(scope, options);

  v1Presence = !options && request.isPresence();
  onResponse = function (message) {
    var response = new Response(message);
    if (response && response.isFor(request)) {
      if (v1Presence) {
        response.forceV1Response();
      }
      if (callback) {
        callback(response.getMessage());
      }
      return true;
    }
    return false;
  };

  this.when('get', onResponse);

  // sync does not return ACK (it sends back a data message)
  return this._write(request);
};

// get returns the actual value of the operation
Client.prototype.get = function (scope, options, callback) {
  var request;

  callback = _chooseFunction(options, callback);
  options = _nullIfFunction(options);

  request = Request.buildGet(scope, options);

  var onResponse = function (message) {
    var response = new Response(message);
    if (response && response.isFor(request)) {
      if (callback) {
        callback(response.getMessage());
      }
      return true;
    }
    return false;
  };

  this.when('get', onResponse);

  // get does not return ACK (it sends back a data message)
  return this._write(request);
};

// Private API

var _chooseFunction = function (options, callback) {
  return typeof(options) === 'function' ? options : callback;
};

var _nullIfFunction = function (options) {
  if (typeof(options) === 'function') {
    return null;
  }
  return options;
};

Client.prototype._addListeners = function () {
  // Add authentication data to a request message; _write() emits authenticateMessage
  this.on('authenticateMessage', function(message) {
    var request = new Request(message);
    request.setAuthData(this._configuration);

    this.emit('messageAuthenticated', request.getMessage());
  });

  // Once the request is authenticated, send it to the server
  this.on('messageAuthenticated', function(message) {
    var request = new Request(message);
    this._sendMessage(request);
  });
};

Client.prototype._write = function(request, callback) {
  var self = this;

  if (callback) {
    request.setAttr('ack', this._ackCounter++);

    // Wait ack
    this.when('ack', function(message) {
      var response = new Response(message);
      self.logger().debug('ack', response);
      if (!response.isAckFor(request)) { return false; }
      callback(request.getMessage());

      return true;
    });
  }

  this.emit('authenticateMessage', request.getMessage());

  return this;
};

Client.prototype._batch = function(response) {
  var to = response.getAttr('to'),
      value = response.getAttr('value'),
      time = response.getAttr('time');

  if (!response.isValid()) {
    this.logger().info('response is invalid:', response.getMessage());
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
Client.prototype._memorize = function(request) {
  var op = request.getAttr('op'),
      to = request.getAttr('to'),
      value = request.getAttr('value');

  switch(op) {
    case 'unsubscribe':
      // Remove from queue
      if (this._subscriptions[to]) {
        delete this._subscriptions[to];
      }
      return true;

    case 'sync':
    case 'subscribe':
      // A catch for when *subscribe* is called after *sync*
      if (this._subscriptions[to] != 'sync') {
        this._subscriptions[to] = op;
      }
      return true;

    case 'set':
      if (request.isPresence()) {
        this._presences[to] = value;
        return true;
      }
  }

  return false;
};

Client.prototype._restore = function() {
  var item, to, counts = { subscriptions: 0, presences: 0, messages: 0 };
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

    while (this._queuedRequests.length) {
      this._write(this._queuedRequests.shift());
      counts.messages += 1;
    }

    this.logger().debug('restore-subscriptions', counts);
  }
};

Client.prototype._sendMessage = function(request) {
  var memorized = this._memorize(request),
      ack = request.getAttr('ack');

  this.emit('message:out', request.getMessage());

  if (this._socket && this.manager.is('activated')) {
    this._socket.sendPacket('message', request.payload());
  } else if (this._isConfigured) {
    this._restoreRequired = true;
    if (!memorized || ack) {
      this._queuedRequests.push(request);
    }
    this.manager.connectWhenAble();
  }
};

Client.prototype._messageReceived = function (msg) {
  var response = new Response(JSON.parse(msg)),
      op = response.getAttr('op'),
      to = response.getAttr('to');

  this.emit('message:in', response.getMessage());

  switch (op) {
    case 'err':
    case 'ack':
    case 'get':
      this.emitNext(op, response.getMessage());
      break;

    case 'sync':
      this._batch(response);
      break;

    default:
      this.emitNext(to, response.getMessage());
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
  var self = this;

  this.control('clientName').nameSync(options, function (message) {
    self.logger('nameSync message: ' + JSON.stringify(message));
  });
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
"client_version.js": function(module, exports, require){
// Auto-generated file, overwritten by scripts/add_package_version.js

function getClientVersion() { return '0.15.0'; };

module.exports = getClientVersion;
}
};
r.m[1] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
};
r.m[2] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
};
r.m[3] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
};
r.m[4] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
"package.json": function(module, exports, require){
module.exports = {
  "author": {
    "name": "Sergey Tsapenko",
    "email": "4031651@gmail.com"
  },
  "name": "sfsm",
  "description": "Simple Finite State Machine. Based on Javascript State Machine v2 (https://github.com/jakesgordon/javascript-state-machine/) By jakesgordon",
  "version": "0.0.4",
  "homepage": "https://github.com/4031651/node-javascript-state-machine",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/4031651/node-javascript-state-machine.git"
  },
  "main": "state-machine.js",
  "engines": {
    "node": ">= 0.4.12"
  },
  "scripts": {
    "test": "TEST=1 ./node_modules/qunit/bin/cli.js -c state-machine.js -t test/test_basics.js test/test_async.js test/test_advanced.js test/test_classes.js test/test_initialize.js"
  },
  "devDependencies": {
    "qunit": "*"
  },
  "readme": "Javascript Finite State Machine (v2.2.0)\n========================================\n\nThis standalone javascript micro-framework provides a finite state machine for your pleasure.\n\n * You can find the [code here](https://github.com/jakesgordon/javascript-state-machine)\n * You can find a [description here](http://codeincomplete.com/posts/2013/1/26/javascript_state_machine_v2_2_0/)\n * You can find a [working demo here](http://codeincomplete.com/posts/2011/8/19/javascript_state_machine_v2/example/)\n\nDownload\n========\n\nYou can download [state-machine.js](https://github.com/jakesgordon/javascript-state-machine/raw/master/state-machine.js),\nor the [minified version](https://github.com/jakesgordon/javascript-state-machine/raw/master/state-machine.min.js)\n\nAlternatively:\n\n    git clone git@github.com:jakesgordon/javascript-state-machine\n\n\n * All code is in state-machine.js\n * Minified version provided in state-machine.min.js\n * No 3rd party library is required\n * Demo can be found in /index.html\n * QUnit tests can be found in /test/index.html\n\nUsage\n=====\n\nInclude `state-machine.min.js` in your application.\n\nIn its simplest form, create a standalone state machine using:\n\n    var fsm = StateMachine.create({\n      initial: 'green',\n      events: [\n        { name: 'warn',  from: 'green',  to: 'yellow' },\n        { name: 'panic', from: 'yellow', to: 'red'    },\n        { name: 'calm',  from: 'red',    to: 'yellow' },\n        { name: 'clear', from: 'yellow', to: 'green'  }\n    ]});\n\n... will create an object with a method for each event:\n\n * fsm.warn()  - transition from 'green' to 'yellow'\n * fsm.panic() - transition from 'yellow' to 'red'\n * fsm.calm()  - transition from 'red' to 'yellow'\n * fsm.clear() - transition from 'yellow' to 'green'\n\nalong with the following members:\n\n * fsm.current   - contains the current state\n * fsm.is(s)     - return true if state `s` is the current state\n * fsm.can(e)    - return true if event `e` can be fired in the current state\n * fsm.cannot(e) - return true if event `e` cannot be fired in the current state\n\nMultiple 'from' and 'to' states for a single event\n==================================================\n\nIf an event is allowed **from** multiple states, and always transitions to the same\nstate, then simply provide an array of states in the `from` attribute of an event. However,\nif an event is allowed from multiple states, but should transition **to** a different\nstate depending on the current state, then provide multiple event entries with\nthe same name:\n\n    var fsm = StateMachine.create({\n      initial: 'hungry',\n      events: [\n        { name: 'eat',  from: 'hungry',                                to: 'satisfied' },\n        { name: 'eat',  from: 'satisfied',                             to: 'full'      },\n        { name: 'eat',  from: 'full',                                  to: 'sick'      },\n        { name: 'rest', from: ['hungry', 'satisfied', 'full', 'sick'], to: 'hungry'    },\n    ]});\n\nThis example will create an object with 2 event methods:\n\n * fsm.eat()\n * fsm.rest()\n\nThe `rest` event will always transition to the `hungry` state, while the `eat` event\nwill transition to a state that is dependent on the current state.\n\n>> NOTE: The `rest` event could use a wildcard '*' for the 'from' state if it should be\nallowed from any current state.\n\n>> NOTE: The `rest` event in the above example can also be specified as multiple events with\nthe same name if you prefer the verbose approach.\n\nCallbacks\n=========\n\n4 types of callback are available by attaching methods to your StateMachine using the following naming conventions:\n\n * `onbeforeEVENT` - fired before the event\n * `onleaveSTATE`  - fired when leaving the old state\n * `onenterSTATE`  - fired when entering the new state\n * `onafterEVENT`  - fired after the event\n\n>> (using your **specific** EVENT and STATE names)\n\nFor convenience, the 2 most useful callbacks can be shortened:\n\n * `onEVENT` - convenience shorthand for `onafterEVENT`\n * `onSTATE` - convenience shorthand for `onenterSTATE`\n\nIn addition, 4 general-purpose callbacks can be used to capture **all** event and state changes:\n\n * `onbeforeevent` - fired before *any* event\n * `onleavestate`  - fired when leaving *any* state\n * `onenterstate`  - fired when entering *any* state\n * `onafterevent`  - fired after *any* event\n\nAll callbacks will be passed the same arguments:\n\n * **event** name\n * **from** state\n * **to** state\n * _(followed by any arguments you passed into the original event method)_\n\nCallbacks can be specified when the state machine is first created:\n\n    var fsm = StateMachine.create({\n      initial: 'green',\n      events: [\n        { name: 'warn',  from: 'green',  to: 'yellow' },\n        { name: 'panic', from: 'yellow', to: 'red'    },\n        { name: 'calm',  from: 'red',    to: 'yellow' },\n        { name: 'clear', from: 'yellow', to: 'green'  }\n      ],\n      callbacks: {\n        onpanic:  function(event, from, to, msg) { alert('panic! ' + msg);               },\n        onclear:  function(event, from, to, msg) { alert('thanks to ' + msg);            },\n        ongreen:  function(event, from, to)      { document.body.className = 'green';    },\n        onyellow: function(event, from, to)      { document.body.className = 'yellow';   },\n        onred:    function(event, from, to)      { document.body.className = 'red';      },\n      }\n    });\n\n    fsm.panic('killer bees');\n    fsm.clear('sedatives in the honey pots');\n    ...\n\nAdditionally, they can be added and removed from the state machine at any time:\n\n    fsm.ongreen      = null;\n    fsm.onyellow     = null;\n    fsm.onred        = null;\n    fsm.onenterstate = function(event, from, to) { document.body.className = to; };\n\n\nThe order in which callbacks occur is as follows:\n\n>> assume event **go** transitions from **red** state to **green**\n\n * `onbeforego`    - specific handler for the **go** event only\n * `onbeforeevent` - generic  handler for all events\n * `onleavered`    - specific handler for the **red** state only\n * `onleavestate`  - generic  handler for all states\n * `onentergreen`  - specific handler for the **green** state only\n * `onenterstate`  - generic  handler for all states\n * `onaftergo`     - specific handler for the **go** event only\n * `onafterevent`  - generic  handler for all events\n\n>> NOTE: the legacy `onchangestate` handler has been deprecated and will be removed in a future version\n\nYou can affect the event in 3 ways:\n\n * return `false` from an `onbeforeEVENT` handler to cancel the event.\n * return `false` from an `onleaveSTATE` handler to cancel the event.\n * return `ASYNC` from an `onleaveSTATE` handler to perform an asynchronous state transition (see next section)\n\nAsynchronous State Transitions\n==============================\n\nSometimes, you need to execute some asynchronous code during a state transition and ensure the\nnew state is not entered until your code has completed.\n\nA good example of this is when you transition out of a `menu` state, perhaps you want to gradually\nfade the menu away, or slide it off the screen and don't want to transition to your `game` state\nuntil after that animation has been performed.\n\nYou can now return `StateMachine.ASYNC` from your `onleavestate` handler and the state machine\nwill be _'put on hold'_ until you are ready to trigger the transition using the new `transition()`\nmethod.\n\nFor example, using jQuery effects:\n\n    var fsm = StateMachine.create({\n\n      initial: 'menu',\n\n      events: [\n        { name: 'play', from: 'menu', to: 'game' },\n        { name: 'quit', from: 'game', to: 'menu' }\n      ],\n\n      callbacks: {\n\n        onentermenu: function() { $('#menu').show(); },\n        onentergame: function() { $('#game').show(); },\n\n        onleavemenu: function() {\n          $('#menu').fadeOut('fast', function() {\n            fsm.transition();\n          });\n          return StateMachine.ASYNC; // tell StateMachine to defer next state until we call transition (in fadeOut callback above)\n        },\n\n        onleavegame: function() {\n          $('#game').slideDown('slow', function() {\n            fsm.transition();\n          };\n          return StateMachine.ASYNC; // tell StateMachine to defer next state until we call transition (in slideDown callback above)\n        }\n\n      }\n    });\n\n>> _NOTE: If you decide to cancel the ASYNC event, you can call `fsm.transition.cancel();`\n\nState Machine Classes\n=====================\n\nYou can also turn all instances of a  _class_ into an FSM by applying\nthe state machine functionality to the prototype, including your callbacks\nin your prototype, and providing a `startup` event for use when constructing\ninstances:\n\n    MyFSM = function() {    // my constructor function\n      this.startup();\n    };\n\n    MyFSM.prototype = {\n\n      onpanic: function(event, from, to) { alert('panic');        },\n      onclear: function(event, from, to) { alert('all is clear'); },\n\n      // my other prototype methods\n\n    };\n\n    StateMachine.create({\n      target: MyFSM.prototype,\n      events: [\n        { name: 'startup', from: 'none',   to: 'green'  },\n        { name: 'warn',    from: 'green',  to: 'yellow' },\n        { name: 'panic',   from: 'yellow', to: 'red'    },\n        { name: 'calm',    from: 'red',    to: 'yellow' },\n        { name: 'clear',   from: 'yellow', to: 'green'  }\n      ]});\n\n\nThis should be easy to adjust to fit your appropriate mechanism for object construction.\n\n>> _NOTE: the `startup` event can be given any name, but it must be present in some form to \n   ensure that each instance constructed is initialized with its own unique `current` state._\n\nInitialization Options\n======================\n\nHow the state machine should initialize can depend on your application requirements, so\nthe library provides a number of simple options.\n\nBy default, if you dont specify any initial state, the state machine will be in the `'none'`\nstate and you would need to provide an event to take it out of this state:\n\n    var fsm = StateMachine.create({\n      events: [\n        { name: 'startup', from: 'none',  to: 'green' },\n        { name: 'panic',   from: 'green', to: 'red'   },\n        { name: 'calm',    from: 'red',   to: 'green' },\n    ]});\n    alert(fsm.current); // \"none\"\n    fsm.startup();\n    alert(fsm.current); // \"green\"\n\nIf you specify the name of your initial state (as in all the earlier examples), then an\nimplicit `startup` event will be created for you and fired when the state machine is constructed.\n\n    var fsm = StateMachine.create({\n      initial: 'green',\n      events: [\n        { name: 'panic', from: 'green', to: 'red'   },\n        { name: 'calm',  from: 'red',   to: 'green' },\n    ]});\n    alert(fsm.current); // \"green\"\n\nIf your object already has a `startup` method you can use a different name for the initial event\n\n    var fsm = StateMachine.create({\n      initial: { state: 'green', event: 'init' },\n      events: [\n        { name: 'panic', from: 'green', to: 'red'   },\n        { name: 'calm',  from: 'red',   to: 'green' },\n    ]});\n    alert(fsm.current); // \"green\"\n\nFinally, if you want to wait to call the initial state transition event until a later date you\ncan `defer` it:\n\n    var fsm = StateMachine.create({\n      initial: { state: 'green', event: 'init', defer: true },\n      events: [\n        { name: 'panic', from: 'green', to: 'red'   },\n        { name: 'calm',  from: 'red',   to: 'green' },\n    ]});\n    alert(fsm.current); // \"none\"\n    fsm.init();\n    alert(fsm.current); // \"green\"\n\nOf course, we have now come full circle, this last example is pretty much functionally the\nsame as the first example in this section where you simply define your own startup event.\n\nSo you have a number of choices available to you when initializing your state machine.\n\n>> _IMPORTANT NOTE: if you are using the pattern described in the previous section \"State Machine\n   Classes\", and wish to declare an `initial` state in this manner, you MUST use the `defer: true`\n   attribute and manually call the starting event in your constructor function. This will ensure\n   that each instance gets its own unique `current` state, rather than an (unwanted) shared\n   `current` state on the prototype object itself._\n\nHandling Failures\n======================\n\nBy default, if you try to call an event method that is not allowed in the current state, the\nstate machine will throw an exception. If you prefer to handle the problem yourself, you can\ndefine a custom `error` handler:\n\n    var fsm = StateMachine.create({\n      initial: 'green',\n      error: function(eventName, from, to, args, errorCode, errorMessage) {\n        return 'event ' + eventName + ' was naughty :- ' + errorMessage;\n      },\n      events: [\n        { name: 'panic', from: 'green', to: 'red'   },\n        { name: 'calm',  from: 'red',   to: 'green' },\n    ]});\n    alert(fsm.calm()); // \"event calm was naughty :- event not allowed in current state green\"\n\nRelease Notes\n=============\n\nSee [RELEASE NOTES](https://github.com/jakesgordon/javascript-state-machine/blob/master/RELEASE_NOTES.md) file.\n\nLicense\n=======\n\nSee [LICENSE](https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE) file.\n\nContact\n=======\n\nIf you have any ideas, feedback, requests or bug reports, you can reach me at\n[jake@codeincomplete.com](mailto:jake@codeincomplete.com), or via\nmy website: [Code inComplete](http://codeincomplete.com/)\n\n\n\n\n\n",
  "readmeFilename": "README.md",
  "bugs": {
    "url": "https://github.com/4031651/node-javascript-state-machine/issues"
  },
  "_id": "sfsm@0.0.4",
  "_from": "sfsm@0.0.4"
};
},
"state-machine.js": function(module, exports, require){
/*

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

}
};
r.m[5] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
"index.js": function(module, exports, require){
function M() { this._events = {}; }
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

},
"package.json": function(module, exports, require){
module.exports = {
  "name": "microee",
  "description": "A tiny EventEmitter-like client and server side library",
  "license": "BSD",
  "version": "0.0.6",
  "author": {
    "name": "Mikito Takada",
    "email": "mixu@mixu.net",
    "url": "http://mixu.net/"
  },
  "keywords": [
    "event",
    "events",
    "eventemitter",
    "emitter"
  ],
  "repository": {
    "type": "git",
    "url": "git://github.com/mixu/microee.git"
  },
  "main": "index.js",
  "scripts": {
    "test": "mocha --ui exports --reporter spec --bail ./test/microee.test.js"
  },
  "devDependencies": {
    "mocha": "*",
    "uglify-js": "~2.4.12"
  },
  "readme": "# microEE\n\nA client and server side library for routing events.\n\n[![Build Status](https://secure.travis-ci.org/mixu/microee.png?branch=master)](https://travis-ci.org/mixu/microee)\n\nI was disgusted by the size of [MiniEE](https://github.com/mixu/miniee) (122 sloc, 4.4kb), so I decided a rewrite was in order.\n\nMicroEE is a more satisfying (~50 sloc, ~1200 characters), and passes the same tests as MiniEE (excluding the RegExp support, but including many real-world tests, such as removing a once() callback, and checking for the correct order of once callback removal).\n\n# Installing:\n\n    npm install microee\n\n# In-browser version\n\nUse the version in `./dist/`. It exports a single global, `microee`.\n\nTo run the in-browser tests, open `./test/index.html` in the browser after cloning this repo and doing npm install (to get Mocha).\n\n# Usage example: `microee.mixin`\n\n    var MicroEE = require('microee');\n    function MyClass() {\n      // ...\n    }\n    MicroEE.mixin(MyClass);\n    MyClass.prototype.foo = function() {\n      // ...\n    };\n\n    var obj = new MyClass();\n    // set string callback\n    obj.on('event', function(arg1, arg2) { console.log(arg1, arg2); });\n    obj.emit('event', 'aaa', 'bbb'); // trigger callback\n\n# API\n\nThe API is based on [Node's EventEmitter](http://nodejs.org/api/events.html).\n\nThere are two additional niceties: `emitter.when(event, listener)` and `.mixin()`.\n\nSupport for `emitter.listeners(event)` was added in `v0.0.6`.\n\n## emitter.on(event, listener)\n\nAdds a listener to the end of the listeners array for the specified event.\n\n```\nserver.on('connection', function (stream) {\n  console.log('someone connected!');\n});\n```\n\nReturns emitter, so calls can be chained.\n\n## emitter.once(event, listener)\n\nAdds a one time listener for the event. This listener is invoked only the next time the event is fired, after which it is removed.\n\nReturns emitter, so calls can be chained.\n\n## emitter.when(event, listener)\n\nAddition to the regular API. If `listener` returns true, the listener is removed. Useful for waiting for a particular set of parameters on a recurring event e.g. in tests.\n\nReturns emitter, so calls can be chained.\n\n## microee.mixin(object)\n\nAddition to the regular API. Extends `object.prototype` with all the microee methods, allowing other classes to act like event emitters.\n\n## emitter.emit(event, [arg1], [arg2], [...])\n\nExecute all listeners on `event`, with the supplied arguments.\n\nReturns emitter, so calls can be chained.\n\n## emitter.removeListener(event, listener)\n\nRemove a listener from the listener array for the specified event.\n\n## emitter.removeAllListeners([event])\n\nRemoves all listeners, or those of the specified event.\n\n## emitter.listeners(event)\n\nReturns an array of listeners for the specified event.\n",
  "readmeFilename": "readme.md",
  "bugs": {
    "url": "https://github.com/mixu/microee/issues"
  },
  "homepage": "https://github.com/mixu/microee",
  "_id": "microee@0.0.6",
  "_from": "microee@*"
};
}
};
r.m[6] = {
"minilog": { exports: Minilog },
"engine.io-client": { exports: eio },
"package.json": function(module, exports, require){
module.exports = {
  "name": "radar_message",
  "version": "1.0.1",
  "description": "radar message api library",
  "main": "lib/index.js",
  "author": {
    "name": "bolddane"
  },
  "license": "APACHE2",
  "dependencies": {
    "minilog": "*"
  },
  "devDependencies": {
    "mocha": "*"
  },
  "scripts": {
    "test": "ls ./test/*.test.js | xargs -n 1 -t -I {} sh -c 'TEST=\"{}\" npm run test-one'",
    "test-one": "mocha --ui exports --reporter spec --slow 2000ms --bail \"$TEST\"",
    "test-one-solo": "mocha --ui exports --reporter spec --slow 2000ms --bail"
  },
  "gitHead": "41a9e7a4fd440be7d3ff4a1df359f0bc2030db67",
  "_id": "radar_message@1.0.1",
  "_shasum": "acfba853478bc57bcfed9a922ababc8abc594c71",
  "_from": "radar_message@1.0.1",
  "_npmVersion": "2.1.4",
  "_nodeVersion": "0.10.21",
  "_npmUser": {
    "name": "bolddane",
    "email": "patrick_obrien53@yahoo.com"
  },
  "maintainers": [
    {
      "name": "bolddane",
      "email": "patrick_obrien53@yahoo.com"
    }
  ],
  "dist": {
    "shasum": "acfba853478bc57bcfed9a922ababc8abc594c71",
    "tarball": "http://registry.npmjs.org/radar_message/-/radar_message-1.0.1.tgz"
  },
  "directories": {},
  "_resolved": "https://registry.npmjs.org/radar_message/-/radar_message-1.0.1.tgz"
};
},
"lib/index.js": function(module, exports, require){
var Request = require('./message_request.js'),
    Response = require('./message_response.js'),
    RadarMessage = function() {};

RadarMessage.Request = Request;
RadarMessage.Response = Response;

module.exports = RadarMessage;

},
"lib/message_request.js": function(module, exports, require){
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
    logger.error('invalid request. op: ' + this.message.op + '; to: ' + this.message.to);
    this.message = {};
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
  var request = new Request(message).setOptions(options);
  if (request.isPresence()) {
    request.forceV2Sync(options);
  }
  return request;
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

Request.prototype.forceV2Sync = function (options) {
  options = options || {};
  options.version = 2;
  this.setAttr('options', options);
};

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
  // Keep check for options, since it is sometimes purposefully null
  if (options) {
    this.setAttr('options', options);
  }

  return this;
};

Request.prototype.isPresence = function () {
  return this.type === 'presence';
};

Request.prototype.setAttr = function (keyName, keyValue) {
  this.message[keyName] = keyValue;
};

Request.prototype.getAttr = function (keyName) {
  return this.message[keyName];
};

Request.prototype.payload = function () {
  return JSON.stringify(this.getMessage());
};

Request.prototype.getType = function () {
  return this.type;
};

// Private methods

Request.prototype._isValid = function () {
  if (!this.message.op || !this.message.to) {
    return false;
  }

  var type = this._getType();
  if (type) {
    if (this._isValidType(type) && this._isValidOperation(type)) {
      this.type = type;
      return true;
    }
  } else {
    logger.error('missing type');
  }
  return false;
};

Request.prototype._isValidType = function (type) {
  for (var key in opTable) {
    if (opTable.hasOwnProperty(key) && key == type) {
      return true;
    }
  }
  this.errMsg = 'invalid type: ' + type;
  logger.error(this.errMsg);
  return false;
};

Request.prototype._isValidOperation = function (type) {
  var ops = opTable[type];

  var isValid = ops && ops.indexOf(this.message.op) >= 0;
  if (!isValid) {
    this.errMsg = 'invalid operation: ' + this.message.op + ' for type: ' + type;
    logger.error(this.errMsg);
  }
  return isValid;
};

Request.prototype._getType = function () {
  return this.message.to.substring(0, this.message.to.indexOf(':'));
};

module.exports = Request;

},
"lib/message_response.js": function(module, exports, require){
var logger = require('minilog')('message:response');

function Response (message) {
  this.message = message;

  if (!this._validate()) {
    logger.error('invalid response. message: ' + JSON.stringify(message));
    this.message = {};
  }
}

Response.prototype.getMessage = function () {
  return this.message;
};

Response.prototype._validate = function () {
  if (!this.message.op) {
    this.errMsg = 'missing op';
    return false;
  }

  switch(this.message.op) {
    case 'ack':
      if (!this.message.value) {
        this.errMsg = 'missing value';
        logger.error(this.errMsg);
        return false;
      }
      break;

    default:
      if (this.message.op != 'err' && !this.message.to) {
        this.errMsg = 'missing to';
        logger.error(this.errMsg);
        return false;
      }
  }

  return true;
};

Response.prototype.isValid = function () {
  return !!this.message.to && !!this.message.value && !!this.message.time;
};

Response.prototype.isFor = function (request) {
  return this.getAttr('to') === request.getAttr('to');
};

Response.prototype.isAckFor = function (request) {
  return this.getAttr('value') === request.getAttr('ack');
};

Response.prototype.getAttr = function (attr) {
  return this.message[attr];
};

Response.prototype.forceV1Response = function () {
  // Sync v1 for presence scopes is inconsistent: the result should be a 'get'
  // message, but instead is an 'online' message.  Take a v2 response and
  // massage it to v1 format prior to returning to the caller.
  var message = this.message, value = {}, userId;
  for (userId in message.value) {
    if (message.value.hasOwnProperty(userId)) {
      // Skip when not defined; causes exception in FF for 'Work Offline'
      if (!message.value[userId]) { continue; }
      value[userId] = message.value[userId].userType;
    }
  }
  message.value = value;
  message.op = 'online';

  this.message = message;
};

module.exports = Response;

}
};
RadarClient = r("index.js");}());
