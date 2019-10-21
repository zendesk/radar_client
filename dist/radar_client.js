var RadarClient =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./lib/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./lib/backoff.js":
/*!************************!*\
  !*** ./lib/backoff.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

function Backoff () {
  this.failures = 0
}

Backoff.durations = [1000, 2000, 4000, 8000, 16000, 32000] // seconds (ticks)
Backoff.fallback = 60000
Backoff.maxSplay = 5000

Backoff.prototype.get = function () {
  var splay = Math.ceil(Math.random() * Backoff.maxSplay)
  return splay + (Backoff.durations[this.failures] || Backoff.fallback)
}

Backoff.prototype.increment = function () {
  this.failures++
}

Backoff.prototype.success = function () {
  this.failures = 0
}

Backoff.prototype.isUnavailable = function () {
  return Backoff.durations.length <= this.failures
}

module.exports = Backoff


/***/ }),

/***/ "./lib/client_version.js":
/*!*******************************!*\
  !*** ./lib/client_version.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports) {

// Auto-generated file, overwritten by scripts/add_package_version.js

function getClientVersion () { return '0.16.6' }

module.exports = getClientVersion


/***/ }),

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var Client = __webpack_require__(/*! ./radar_client */ "./lib/radar_client.js")
var instance = new Client()
var Backoff = __webpack_require__(/*! ./backoff.js */ "./lib/backoff.js")

instance._log = __webpack_require__(/*! minilog */ "minilog")
instance.Backoff = Backoff

// This module makes radar_client a singleton to prevent multiple connections etc.

module.exports = instance


/***/ }),

/***/ "./lib/radar_client.js":
/*!*****************************!*\
  !*** ./lib/radar_client.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* globals setImmediate */
var MicroEE = __webpack_require__(/*! microee */ "./node_modules/microee/index.js")
var eio = __webpack_require__(/*! engine.io-client */ "engine.io-client")
var Scope = __webpack_require__(/*! ./scope.js */ "./lib/scope.js")
var StateMachine = __webpack_require__(/*! ./state.js */ "./lib/state.js")
var immediate = typeof setImmediate !== 'undefined' ? setImmediate : function (fn) { setTimeout(fn, 1) }
var getClientVersion = __webpack_require__(/*! ./client_version.js */ "./lib/client_version.js")
var Request = __webpack_require__(/*! radar_message */ "./node_modules/radar_message/lib/index.js").Request
var Response = __webpack_require__(/*! radar_message */ "./node_modules/radar_message/lib/index.js").Response

function Client (backend) {
  this.logger = __webpack_require__(/*! minilog */ "minilog")('radar_client')
  this._ackCounter = 1
  this._channelSyncTimes = {}
  this._uses = {}
  this._presences = {}
  this._subscriptions = {}
  this._restoreRequired = false
  this._queuedRequests = []
  this._identitySetRequired = true
  this._isConfigured = false

  this._createManager()
  this.configure(false)
  this._addListeners()

  // Allow backend substitution for tests
  this.backend = backend || eio
}

MicroEE.mixin(Client)

// Public API

// Each use of the client is registered with "alloc", and a given use often
// persists through many connects and disconnects.
// The state machine - "manager" - handles connects and disconnects
Client.prototype.alloc = function (useName, callback) {
  var self = this
  if (!this._uses[useName]) {
    this.logger().info('alloc: ', useName)
    this.once('ready', function () {
      self.logger().info('ready: ', useName)
    })

    this._uses[useName] = true
  }

  callback && this.once('ready', function () {
    if (Object.prototype.hasOwnProperty.call(self._uses, useName)) {
      callback()
    }
  })

  if (this._isConfigured) {
    this.manager.start()
  } else {
    this._waitingForConfigure = true
  }

  return this
}

// When done with a given use of the client, unregister the use
// Only when all uses are unregistered do we disconnect the client
Client.prototype.dealloc = function (useName) {
  this.logger().info({ op: 'dealloc', useName: useName })

  delete this._uses[useName]

  var stillAllocated = false
  var key

  for (key in this._uses) {
    if (Object.prototype.hasOwnProperty.call(this._uses, key)) {
      stillAllocated = true
      break
    }
  }
  if (!stillAllocated) {
    this.logger().info('closing the connection')
    this.manager.close()
  }
}

Client.prototype.currentState = function () {
  return this.manager.current
}

Client.prototype.configure = function (hash) {
  var configuration = hash || this._configuration || { accountName: '', userId: 0, userType: 0 }
  configuration.userType = configuration.userType || 0
  this._configuration = this._me = configuration
  this._isConfigured = this._isConfigured || !!hash

  if (this._isConfigured && this._waitingForConfigure) {
    this._waitingForConfigure = false
    this.manager.start()
  }

  return this
}

Client.prototype.configuration = function (configKey) {
  if (configKey in this._configuration) {
    return JSON.parse(JSON.stringify(this._configuration[configKey]))
  } else {
    return null
  }
}

Client.prototype.attachStateMachineErrorHandler = function (errorHandler) {
  this.manager.attachErrorHandler(errorHandler)
}

Client.prototype.currentUserId = function () {
  return this._configuration && this._configuration.userId
}

Client.prototype.currentClientId = function () {
  return this._socket && this._socket.id
}

// Return the chainable scope object for a given message type

Client.prototype.message = function (scope) {
  return new Scope('message', scope, this)
}

Client.prototype.presence = function (scope) {
  return new Scope('presence', scope, this)
}

Client.prototype.status = function (scope) {
  return new Scope('status', scope, this)
}

Client.prototype.stream = function (scope) {
  return new Scope('stream', scope, this)
}

Client.prototype.control = function (scope) {
  return new Scope('control', scope, this)
}

// Operations

Client.prototype.nameSync = function (scope, options, callback) {
  var request = Request.buildNameSync(scope, options)
  return this._write(request, callback)
}

Client.prototype.push = function (scope, resource, action, value, callback) {
  var request = Request.buildPush(scope, resource, action, value)
  return this._write(request, callback)
}

Client.prototype.set = function (scope, value, clientData, callback) {
  var request

  callback = _chooseFunction(clientData, callback)
  clientData = _nullIfFunction(clientData)

  request = Request.buildSet(scope, value,
    this._configuration.userId, this._configuration.userType,
    clientData)

  return this._write(request, callback)
}

Client.prototype.publish = function (scope, value, callback) {
  var request = Request.buildPublish(scope, value)
  return this._write(request, callback)
}

Client.prototype.subscribe = function (scope, options, callback) {
  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  var request = Request.buildSubscribe(scope, options)

  return this._write(request, callback)
}

Client.prototype.unsubscribe = function (scope, callback) {
  var request = Request.buildUnsubscribe(scope)
  return this._write(request, callback)
}

// sync returns the actual value of the operation
Client.prototype.sync = function (scope, options, callback) {
  var request, onResponse, v1Presence

  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  request = Request.buildSync(scope, options)

  v1Presence = !options && request.isPresence()
  onResponse = function (message) {
    var response = new Response(message)
    if (response && response.isFor(request)) {
      if (v1Presence) {
        response.forceV1Response()
      }
      if (callback) {
        callback(response.getMessage())
      }
      return true
    }
    return false
  }

  this.when('get', onResponse)

  // sync does not return ACK (it sends back a data message)
  return this._write(request)
}

// get returns the actual value of the operation
Client.prototype.get = function (scope, options, callback) {
  var request

  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  request = Request.buildGet(scope, options)

  var onResponse = function (message) {
    var response = new Response(message)
    if (response && response.isFor(request)) {
      if (callback) {
        callback(response.getMessage())
      }
      return true
    }
    return false
  }

  this.when('get', onResponse)

  // get does not return ACK (it sends back a data message)
  return this._write(request)
}

// Private API

var _chooseFunction = function (options, callback) {
  return typeof (options) === 'function' ? options : callback
}

var _nullIfFunction = function (options) {
  if (typeof (options) === 'function') {
    return null
  }
  return options
}

Client.prototype._addListeners = function () {
  // Add authentication data to a request message; _write() emits authenticateMessage
  this.on('authenticateMessage', function (message) {
    var request = new Request(message)
    request.setAuthData(this._configuration)

    this.emit('messageAuthenticated', request.getMessage())
  })

  // Once the request is authenticated, send it to the server
  this.on('messageAuthenticated', function (message) {
    var request = new Request(message)
    this._sendMessage(request)
  })
}

Client.prototype._write = function (request, callback) {
  var self = this

  if (callback) {
    request.setAttr('ack', this._ackCounter++)

    // Wait ack
    this.when('ack', function (message) {
      var response = new Response(message)
      self.logger().debug('ack', response)
      if (!response.isAckFor(request)) { return false }
      callback(request.getMessage())

      return true
    })
  }

  this.emit('authenticateMessage', request.getMessage())

  return this
}

Client.prototype._batch = function (response) {
  var to = response.getAttr('to')
  var value = response.getAttr('value')
  var time = response.getAttr('time')

  if (!response.isValid()) {
    this.logger().info('response is invalid:', response.getMessage())
    return false
  }

  var index = 0
  var data
  var length = value.length
  var newest = time
  var current = this._channelSyncTimes[to] || 0

  for (; index < length; index = index + 2) {
    data = JSON.parse(value[index])
    time = value[index + 1]

    if (time > current) {
      this.emitNext(to, data)
    }
    if (time > newest) {
      newest = time
    }
  }
  this._channelSyncTimes[to] = newest
}

Client.prototype._createManager = function () {
  var self = this
  var manager = this.manager = StateMachine.create()

  manager.on('enterState', function (state) {
    self.emit(state)
  })

  manager.on('event', function (event) {
    self.emit(event)
  })

  manager.on('connect', function (data) {
    var socket = self._socket = new self.backend.Socket(self._configuration)

    socket.once('open', function () {
      if (socket !== self._socket) {
        socket.removeAllListeners('message')
        socket.removeAllListeners('open')
        socket.removeAllListeners('close')
        socket.close()
        return
      }

      self.logger().debug('socket open', socket.id)
      manager.established()
    })

    socket.once('close', function (reason, description) {
      self.logger().debug('socket closed', socket.id, reason, description)
      socket.removeAllListeners('message')
      // Patch for polling-xhr continuing to poll after socket close (HTTP:POST
      // failure).  socket.transport is in error but not closed, so if a subsequent
      // poll succeeds, the transport remains open and polling until server closes
      // the socket.
      if (socket.transport) {
        socket.transport.close()
      }

      if (socket === self._socket) {
        self._socket = null
        if (!manager.is('closed')) {
          manager.disconnect()
        }
      }
    })

    socket.on('message', function (message) {
      if (socket !== self._socket) {
        socket.removeAllListeners('message')
        socket.removeAllListeners('open')
        socket.removeAllListeners('close')
        socket.close()
        return
      }
      self._messageReceived(message)
    })

    socket.on('error', function (error) {
      self.emit('socketError', error)
    })

    manager.removeAllListeners('close')
    manager.once('close', function () {
      socket.close()
    })
  })

  manager.on('activate', function () {
    if (self._socket === null) {
      manager.disconnect()
    } else {
      self._identitySet()
      self._restore()
      self.emit('ready')
    }
  })

  manager.on('authenticate', function () {
    // Can be overridden in order to establish an authentication protocol
    manager.activate()
  })

  manager.on('disconnect', function () {
    self._restoreRequired = true
    self._identitySetRequired = true

    var socket = self._socket
    if (socket) {
      // If you reach disconnect with a socket obj,
      // it might be from startGuard (open timeout reached)
      // Clear out the current attempt to get a socket
      // and close it if it opens
      socket.removeAllListeners('message')
      socket.removeAllListeners('open')
      socket.removeAllListeners('close')
      socket.once('open', function () {
        self.logger().debug('socket open, closing it', socket.id)
        socket.close()
      })
      self._socket = null
    }
  })

  manager.on('backoff', function (time, step) {
    self.emit('backoff', time, step)
  })
}

// Memorize subscriptions and presence states; return "true" for a message that
// adds to the memorized subscriptions or presences
Client.prototype._memorize = function (request) {
  var op = request.getAttr('op')
  var to = request.getAttr('to')
  var value = request.getAttr('value')

  switch (op) {
    case 'unsubscribe':
      // Remove from queue
      if (this._subscriptions[to]) {
        delete this._subscriptions[to]
      }
      return true

    case 'sync':
    case 'subscribe':
      // A catch for when *subscribe* is called after *sync*
      if (this._subscriptions[to] !== 'sync') {
        this._subscriptions[to] = op
      }
      return true

    case 'set':
      if (request.isPresence()) {
        if (value !== 'offline') {
          this._presences[to] = value
        } else {
          delete this._presences[to]
        }
        return true
      }
  }

  return false
}

Client.prototype._restore = function () {
  var item
  var to
  var counts = { subscriptions: 0, presences: 0, messages: 0 }
  if (this._restoreRequired) {
    this._restoreRequired = false

    for (to in this._subscriptions) {
      if (Object.prototype.hasOwnProperty.call(this._subscriptions, to)) {
        item = this._subscriptions[to]
        this[item](to)
        counts.subscriptions += 1
      }
    }

    for (to in this._presences) {
      if (Object.prototype.hasOwnProperty.call(this._presences, to)) {
        this.set(to, this._presences[to])
        counts.presences += 1
      }
    }

    while (this._queuedRequests.length) {
      this._write(this._queuedRequests.shift())
      counts.messages += 1
    }

    this.logger().debug('restore-subscriptions', counts)
  }
}

Client.prototype._sendMessage = function (request) {
  var memorized = this._memorize(request)
  var ack = request.getAttr('ack')

  this.emit('message:out', request.getMessage())

  if (this._socket && this.manager.is('activated')) {
    this._socket.sendPacket('message', request.payload())
  } else if (this._isConfigured) {
    this._restoreRequired = true
    this._identitySetRequired = true
    if (!memorized || ack) {
      this._queuedRequests.push(request)
    }
    this.manager.connectWhenAble()
  }
}

Client.prototype._messageReceived = function (msg) {
  var response = new Response(JSON.parse(msg))
  var op = response.getAttr('op')
  var to = response.getAttr('to')

  this.emit('message:in', response.getMessage())

  switch (op) {
    case 'err':
    case 'ack':
    case 'get':
      this.emitNext(op, response.getMessage())
      break

    case 'sync':
      this._batch(response)
      break

    default:
      this.emitNext(to, response.getMessage())
  }
}

Client.prototype.emitNext = function () {
  var self = this
  var args = Array.prototype.slice.call(arguments)
  immediate(function () { self.emit.apply(self, args) })
}

Client.prototype._identitySet = function () {
  if (this._identitySetRequired) {
    this._identitySetRequired = false

    if (!this.name) {
      this.name = this._uuidV4Generate()
    }

    // Send msg that associates this.id with current name
    var association = { id: this._socket.id, name: this.name }
    var clientVersion = getClientVersion()
    var options = { association: association, clientVersion: clientVersion }
    var self = this

    this.control('clientName').nameSync(options, function (message) {
      self.logger('nameSync message: ' + JSON.stringify(message))
    })
  }
}

// Variant (by Jeff Ward) of code behind node-uuid, but avoids need for module
var lut = []
for (var i = 0; i < 256; i++) { lut[i] = (i < 16 ? '0' : '') + (i).toString(16) }
Client.prototype._uuidV4Generate = function () {
  var d0 = Math.random() * 0xffffffff | 0
  var d1 = Math.random() * 0xffffffff | 0
  var d2 = Math.random() * 0xffffffff | 0
  var d3 = Math.random() * 0xffffffff | 0
  return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
  lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
  lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
  lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff]
}

Client.setBackend = function (lib) { eio = lib }

module.exports = Client


/***/ }),

/***/ "./lib/scope.js":
/*!**********************!*\
  !*** ./lib/scope.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

function Scope (typeName, scope, client) {
  this.client = client
  this.prefix = this._buildScopePrefix(typeName, scope, client.configuration('accountName'))
}

var props = ['set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync']

var init = function (name) {
  Scope.prototype[name] = function () {
    var args = Array.prototype.slice.apply(arguments)
    args.unshift(this.prefix)
    this.client[name].apply(this.client, args)
    return this
  }
}

for (var i = 0; i < props.length; i++) {
  init(props[i])
}

Scope.prototype._buildScopePrefix = function (typeName, scope, accountName) {
  return typeName + ':/' + accountName + '/' + scope
}

module.exports = Scope


/***/ }),

/***/ "./lib/state.js":
/*!**********************!*\
  !*** ./lib/state.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var log = __webpack_require__(/*! minilog */ "minilog")('radar_state')
var MicroEE = __webpack_require__(/*! microee */ "./node_modules/microee/index.js")
var Backoff = __webpack_require__(/*! ./backoff */ "./lib/backoff.js")
var Machine = __webpack_require__(/*! sfsm */ "./node_modules/sfsm/state-machine.js")

function create () {
  var backoff = new Backoff()
  var machine = Machine.create({
    error: function (name, from, to, args, type, message, err) {
      log.warn('state-machine-error', arguments)

      if (err) {
        if (this.errorHandler) {
          this.errorHandler(name, from, to, args, type, message, err)
        } else {
          throw err
        }
      }
    },

    events: [
      { name: 'connect', from: ['opened', 'disconnected'], to: 'connecting' },
      { name: 'established', from: 'connecting', to: 'connected' },
      { name: 'authenticate', from: 'connected', to: 'authenticating' },
      { name: 'activate', from: ['authenticating', 'activated'], to: 'activated' },
      { name: 'disconnect', from: Machine.WILDCARD, to: 'disconnected' },
      { name: 'close', from: Machine.WILDCARD, to: 'closed' },
      { name: 'open', from: ['none', 'closed'], to: 'opened' }
    ],

    callbacks: {
      onevent: function (event, from, to) {
        log.debug('from ' + from + ' -> ' + to + ', event: ' + event)

        this.emit('event', event)
        this.emit(event, arguments)
      },

      onstate: function (event, from, to) {
        this.emit('enterState', to)
        this.emit(to, arguments)
      },

      onconnecting: function () {
        this.startGuard()
      },

      onestablished: function () {
        this.cancelGuard()
        backoff.success()
        this.authenticate()
      },

      onclose: function () {
        this.cancelGuard()
      },

      ondisconnected: function (event, from, to) {
        if (this._timer) {
          clearTimeout(this._timer)
          delete this._timer
        }

        var time = backoff.get()
        backoff.increment()

        this.emit('backoff', time, backoff.failures)
        log.debug('reconnecting in ' + time + 'msec')

        this._timer = setTimeout(function () {
          delete machine._timer
          if (machine.is('disconnected')) {
            machine.connect()
          }
        }, time)

        if (backoff.isUnavailable()) {
          log.info('unavailable')
          this.emit('unavailable')
        }
      }
    }
  })

  // For testing
  machine._backoff = backoff
  machine._connectTimeout = 10000

  for (var property in MicroEE.prototype) {
    if (Object.prototype.hasOwnProperty.call(MicroEE.prototype, property)) {
      machine[property] = MicroEE.prototype[property]
    }
  }

  machine.open()

  machine.start = function () {
    if (this.is('closed')) {
      this.open()
    }

    if (this.is('activated')) {
      this.activate()
    } else {
      this.connectWhenAble()
    }
  }

  machine.startGuard = function () {
    machine.cancelGuard()
    machine._guard = setTimeout(function () {
      log.info('startGuard: disconnect from timeout')
      machine.disconnect()
    }, machine._connectTimeout)
  }

  machine.cancelGuard = function () {
    if (machine._guard) {
      clearTimeout(machine._guard)
      delete machine._guard
    }
  }

  machine.connectWhenAble = function () {
    if (!(this.is('connected') || this.is('activated'))) {
      if (this.can('connect')) {
        this.connect()
      } else {
        this.once('enterState', function () {
          machine.connectWhenAble()
        })
      }
    }
  }

  machine.attachErrorHandler = function (errorHandler) {
    if (typeof errorHandler === 'function') {
      this.errorHandler = errorHandler
    } else {
      log.warn('errorHandler must be a function')
    }
  }

  return machine
}

module.exports = { create: create }


/***/ }),

/***/ "./node_modules/microee/index.js":
/*!***************************************!*\
  !*** ./node_modules/microee/index.js ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

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


/***/ }),

/***/ "./node_modules/radar_message/lib/batch_message.js":
/*!*********************************************************!*\
  !*** ./node_modules/radar_message/lib/batch_message.js ***!
  \*********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

class Batch {
  constructor () {
    const messages = [...arguments]
    this.value = messages
    this.op = 'batch'
  }

  add (message) {
    this.value.push(message)
  }

  get length () {
    return this.value.length
  }

  toJSON () {
    return {
      op: this.op,
      length: this.length,
      value: this.value
    }
  }
}

module.exports = Batch


/***/ }),

/***/ "./node_modules/radar_message/lib/index.js":
/*!*************************************************!*\
  !*** ./node_modules/radar_message/lib/index.js ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const Request = __webpack_require__(/*! ./message_request */ "./node_modules/radar_message/lib/message_request.js")
const Response = __webpack_require__(/*! ./message_response */ "./node_modules/radar_message/lib/message_response.js")
const Batch = __webpack_require__(/*! ./batch_message */ "./node_modules/radar_message/lib/batch_message.js")
const RadarMessage = {}

RadarMessage.Batch = Batch
RadarMessage.Request = Request
RadarMessage.Response = Response

module.exports = RadarMessage


/***/ }),

/***/ "./node_modules/radar_message/lib/message_request.js":
/*!***********************************************************!*\
  !*** ./node_modules/radar_message/lib/message_request.js ***!
  \***********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const logger = __webpack_require__(/*! minilog */ "minilog")('message:request')

const opTable = {
  control: ['nameSync', 'disconnect'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync', 'unsubscribe']
}

const Request = function (message) {
  this.message = message

  if (!this._isValid()) {
    logger.error('invalid request. op: ' + this.message.op + '; to: ' + this.message.to)
    this.message = {}
  }
}

Request.buildGet = function (scope, options, message = { op: 'get', to: scope }) {
  return new Request(message).setOptions(options)
}

Request.buildPublish = function (scope, value, message = { op: 'publish', to: scope }) {
  const request = new Request(message)
  request.setAttr('value', value)

  return request
}

Request.buildPush = function (scope, resource, action, value, message = { op: 'push', to: scope }) {
  const request = new Request(message)
  request.setAttr('resource', resource)
  request.setAttr('action', action)
  request.setAttr('value', value)

  return request
}

Request.buildNameSync = function (scope, options, message = { op: 'nameSync', to: scope }) {
  return new Request(message).setOptions(options)
}

Request.buildSet = function (scope, value, key, userType, clientData, message = { op: 'set', to: scope }) {
  const request = new Request(message)
  request.setAttr('value', value)
  request.setAttr('key', key)
  request.setAttr('type', userType)
  if (clientData) {
    request.setAttr('clientData', clientData)
  }

  return request
}

Request.buildSync = function (scope, options, message = { op: 'sync', to: scope }) {
  const request = new Request(message).setOptions(options)
  if (request.isPresence()) {
    request.forceV2Sync(options)
  }
  return request
}

Request.buildSubscribe = function (scope, options, message = { op: 'subscribe', to: scope }) {
  return new Request(message).setOptions(options)
}

Request.buildUnsubscribe = function (scope, message = { op: 'unsubscribe', to: scope }) {
  return new Request(message)
}

// Instance methods

Request.prototype.forceV2Sync = function (options = {}) {
  options = options || {} // options is sometimes null, which would cause an exception on the next line
  options.version = 2
  this.setAttr('options', options)
}

Request.prototype.setAuthData = function (configuration) {
  this.setAttr('userData', configuration.userData)
  if (configuration.auth) {
    this.setAttr('auth', configuration.auth)
    this.setAttr('userId', configuration.userId)
    this.setAttr('userType', configuration.userType)
    this.setAttr('accountName', configuration.accountName)
  }
}

Request.prototype.getMessage = function () {
  return this.message
}

Request.prototype.setOptions = function (options) {
  // Keep check for options, since it is sometimes purposefully null
  if (options) {
    this.setAttr('options', options)
  }

  return this
}

Request.prototype.isPresence = function () {
  return this.type === 'presence'
}

Request.prototype.setAttr = function (keyName, keyValue) {
  this.message[keyName] = keyValue
}

Request.prototype.getAttr = function (keyName) {
  return this.message[keyName]
}

Request.prototype.payload = function () {
  return JSON.stringify(this.getMessage())
}

Request.prototype.getType = function () {
  return this.type
}

// Private methods

Request.prototype._isValid = function () {
  if (!this.message.op || !this.message.to) {
    return false
  }

  const type = this._getType()
  if (type) {
    if (this._isValidType(type) && this._isValidOperation(type)) {
      this.type = type
      return true
    }
  } else {
    logger.error('missing type')
  }
  return false
}

Request.prototype._isValidType = function (type) {
  for (const key in opTable) {
    if (Object.prototype.hasOwnProperty.call(opTable, key) && key === type) {
      return true
    }
  }
  this.errMsg = 'invalid type: ' + type
  logger.error(this.errMsg)
  return false
}

Request.prototype._isValidOperation = function (type, ops = opTable[type]) {
  const isValid = ops && ops.indexOf(this.message.op) >= 0
  if (!isValid) {
    this.errMsg = 'invalid operation: ' + this.message.op + ' for type: ' + type
    logger.error(this.errMsg)
  }
  return isValid
}

Request.prototype._getType = function () {
  return this.message.to.substring(0, this.message.to.indexOf(':'))
}

module.exports = Request


/***/ }),

/***/ "./node_modules/radar_message/lib/message_response.js":
/*!************************************************************!*\
  !*** ./node_modules/radar_message/lib/message_response.js ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const logger = __webpack_require__(/*! minilog */ "minilog")('message:response')

function Response (message) {
  this.message = message

  if (!this._validate()) {
    logger.error('invalid response. message: ' + JSON.stringify(message))
    this.message = {}
  }
}

Response.prototype.getMessage = function () {
  return this.message
}

Response.prototype._validate = function () {
  if (!this.message.op) {
    this.errMsg = 'missing op'
    return false
  }

  switch (this.message.op) {
    case 'ack':
      if (!this.message.value) {
        this.errMsg = 'missing value'
        logger.error(this.errMsg)
        return false
      }
      break

    default:
      if (this.message.op !== 'err' && !this.message.to) {
        this.errMsg = 'missing to'
        logger.error(this.errMsg)
        return false
      }
  }

  return true
}

Response.prototype.isValid = function () {
  return !!this.message.to && !!this.message.value && !!this.message.time
}

Response.prototype.isFor = function (request) {
  return this.getAttr('to') === request.getAttr('to')
}

Response.prototype.isAckFor = function (request) {
  return this.getAttr('value') === request.getAttr('ack')
}

Response.prototype.getAttr = function (attr) {
  return this.message[attr]
}

Response.prototype.forceV1Response = function () {
  // Sync v1 for presence scopes is inconsistent: the result should be a 'get'
  // message, but instead is an 'online' message.  Take a v2 response and
  // massage it to v1 format prior to returning to the caller.
  const message = this.message
  const value = {}

  for (const userId in message.value) {
    if (Object.prototype.hasOwnProperty.call(message.value, userId)) {
      // Skip when not defined; causes exception in FF for 'Work Offline'
      if (!message.value[userId]) { continue }
      value[userId] = message.value[userId].userType
    }
  }
  message.value = value
  message.op = 'online'

  this.message = message
}

module.exports = Response


/***/ }),

/***/ "./node_modules/sfsm/state-machine.js":
/*!********************************************!*\
  !*** ./node_modules/sfsm/state-machine.js ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

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


/***/ }),

/***/ "engine.io-client":
/*!**********************!*\
  !*** external "eio" ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = eio;

/***/ }),

/***/ "minilog":
/*!**************************!*\
  !*** external "Minilog" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = Minilog;

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9SYWRhckNsaWVudC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9SYWRhckNsaWVudC8uL2xpYi9iYWNrb2ZmLmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50Ly4vbGliL2NsaWVudF92ZXJzaW9uLmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50Ly4vbGliL2luZGV4LmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50Ly4vbGliL3JhZGFyX2NsaWVudC5qcyIsIndlYnBhY2s6Ly9SYWRhckNsaWVudC8uL2xpYi9zY29wZS5qcyIsIndlYnBhY2s6Ly9SYWRhckNsaWVudC8uL2xpYi9zdGF0ZS5qcyIsIndlYnBhY2s6Ly9SYWRhckNsaWVudC8uL25vZGVfbW9kdWxlcy9taWNyb2VlL2luZGV4LmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50Ly4vbm9kZV9tb2R1bGVzL3JhZGFyX21lc3NhZ2UvbGliL2JhdGNoX21lc3NhZ2UuanMiLCJ3ZWJwYWNrOi8vUmFkYXJDbGllbnQvLi9ub2RlX21vZHVsZXMvcmFkYXJfbWVzc2FnZS9saWIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vUmFkYXJDbGllbnQvLi9ub2RlX21vZHVsZXMvcmFkYXJfbWVzc2FnZS9saWIvbWVzc2FnZV9yZXF1ZXN0LmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50Ly4vbm9kZV9tb2R1bGVzL3JhZGFyX21lc3NhZ2UvbGliL21lc3NhZ2VfcmVzcG9uc2UuanMiLCJ3ZWJwYWNrOi8vUmFkYXJDbGllbnQvLi9ub2RlX21vZHVsZXMvc2ZzbS9zdGF0ZS1tYWNoaW5lLmpzIiwid2VicGFjazovL1JhZGFyQ2xpZW50L2V4dGVybmFsIFwiZWlvXCIiLCJ3ZWJwYWNrOi8vUmFkYXJDbGllbnQvZXh0ZXJuYWwgXCJNaW5pbG9nXCIiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7UUFBQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGtEQUFrRDtBQUNsRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QztBQUN4Qzs7QUFFQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsUUFBUSxnQkFBZ0I7QUFDeEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0EsS0FB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QTBELGlHQUFpRyxFQUFFO0FBQzdKLDBEQUEwRCxvR0FBb0csRUFBRTtBQUNoSywwREFBMEQsaUdBQWlHLEVBQUU7QUFDN0osMERBQTBELG9HQUFvRyxFQUFFOztBQUVoSywwREFBMEQsdUdBQXVHLEVBQUU7QUFDbkssMERBQTBELHVHQUF1RyxFQUFFO0FBQ25LLDBEQUEwRCx1R0FBdUcsRUFBRTtBQUNuSywwREFBMEQsdUdBQXVHLEVBQUU7O0FBRW5LO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLDBEQUEwRDs7QUFFMUQ7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZDQUE2QztBQUM3QztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsSUFBSTs7Ozs7Ozs7Ozs7O0FDNUxKLHFCOzs7Ozs7Ozs7OztBQ0FBLHlCIiwiZmlsZSI6ImUzODcyZWZlMDgzOGY0ZWRlNTc1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9saWIvaW5kZXguanNcIik7XG4iLCJmdW5jdGlvbiBCYWNrb2ZmICgpIHtcbiAgdGhpcy5mYWlsdXJlcyA9IDBcbn1cblxuQmFja29mZi5kdXJhdGlvbnMgPSBbMTAwMCwgMjAwMCwgNDAwMCwgODAwMCwgMTYwMDAsIDMyMDAwXSAvLyBzZWNvbmRzICh0aWNrcylcbkJhY2tvZmYuZmFsbGJhY2sgPSA2MDAwMFxuQmFja29mZi5tYXhTcGxheSA9IDUwMDBcblxuQmFja29mZi5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3BsYXkgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIEJhY2tvZmYubWF4U3BsYXkpXG4gIHJldHVybiBzcGxheSArIChCYWNrb2ZmLmR1cmF0aW9uc1t0aGlzLmZhaWx1cmVzXSB8fCBCYWNrb2ZmLmZhbGxiYWNrKVxufVxuXG5CYWNrb2ZmLnByb3RvdHlwZS5pbmNyZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZmFpbHVyZXMrK1xufVxuXG5CYWNrb2ZmLnByb3RvdHlwZS5zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmZhaWx1cmVzID0gMFxufVxuXG5CYWNrb2ZmLnByb3RvdHlwZS5pc1VuYXZhaWxhYmxlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gQmFja29mZi5kdXJhdGlvbnMubGVuZ3RoIDw9IHRoaXMuZmFpbHVyZXNcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrb2ZmXG4iLCIvLyBBdXRvLWdlbmVyYXRlZCBmaWxlLCBvdmVyd3JpdHRlbiBieSBzY3JpcHRzL2FkZF9wYWNrYWdlX3ZlcnNpb24uanNcblxuZnVuY3Rpb24gZ2V0Q2xpZW50VmVyc2lvbiAoKSB7IHJldHVybiAnMC4xNi42JyB9XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q2xpZW50VmVyc2lvblxuIiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vcmFkYXJfY2xpZW50JylcbnZhciBpbnN0YW5jZSA9IG5ldyBDbGllbnQoKVxudmFyIEJhY2tvZmYgPSByZXF1aXJlKCcuL2JhY2tvZmYuanMnKVxuXG5pbnN0YW5jZS5fbG9nID0gcmVxdWlyZSgnbWluaWxvZycpXG5pbnN0YW5jZS5CYWNrb2ZmID0gQmFja29mZlxuXG4vLyBUaGlzIG1vZHVsZSBtYWtlcyByYWRhcl9jbGllbnQgYSBzaW5nbGV0b24gdG8gcHJldmVudCBtdWx0aXBsZSBjb25uZWN0aW9ucyBldGMuXG5cbm1vZHVsZS5leHBvcnRzID0gaW5zdGFuY2VcbiIsIi8qIGdsb2JhbHMgc2V0SW1tZWRpYXRlICovXG52YXIgTWljcm9FRSA9IHJlcXVpcmUoJ21pY3JvZWUnKVxudmFyIGVpbyA9IHJlcXVpcmUoJ2VuZ2luZS5pby1jbGllbnQnKVxudmFyIFNjb3BlID0gcmVxdWlyZSgnLi9zY29wZS5qcycpXG52YXIgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZS5qcycpXG52YXIgaW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gJ3VuZGVmaW5lZCcgPyBzZXRJbW1lZGlhdGUgOiBmdW5jdGlvbiAoZm4pIHsgc2V0VGltZW91dChmbiwgMSkgfVxudmFyIGdldENsaWVudFZlcnNpb24gPSByZXF1aXJlKCcuL2NsaWVudF92ZXJzaW9uLmpzJylcbnZhciBSZXF1ZXN0ID0gcmVxdWlyZSgncmFkYXJfbWVzc2FnZScpLlJlcXVlc3RcbnZhciBSZXNwb25zZSA9IHJlcXVpcmUoJ3JhZGFyX21lc3NhZ2UnKS5SZXNwb25zZVxuXG5mdW5jdGlvbiBDbGllbnQgKGJhY2tlbmQpIHtcbiAgdGhpcy5sb2dnZXIgPSByZXF1aXJlKCdtaW5pbG9nJykoJ3JhZGFyX2NsaWVudCcpXG4gIHRoaXMuX2Fja0NvdW50ZXIgPSAxXG4gIHRoaXMuX2NoYW5uZWxTeW5jVGltZXMgPSB7fVxuICB0aGlzLl91c2VzID0ge31cbiAgdGhpcy5fcHJlc2VuY2VzID0ge31cbiAgdGhpcy5fc3Vic2NyaXB0aW9ucyA9IHt9XG4gIHRoaXMuX3Jlc3RvcmVSZXF1aXJlZCA9IGZhbHNlXG4gIHRoaXMuX3F1ZXVlZFJlcXVlc3RzID0gW11cbiAgdGhpcy5faWRlbnRpdHlTZXRSZXF1aXJlZCA9IHRydWVcbiAgdGhpcy5faXNDb25maWd1cmVkID0gZmFsc2VcblxuICB0aGlzLl9jcmVhdGVNYW5hZ2VyKClcbiAgdGhpcy5jb25maWd1cmUoZmFsc2UpXG4gIHRoaXMuX2FkZExpc3RlbmVycygpXG5cbiAgLy8gQWxsb3cgYmFja2VuZCBzdWJzdGl0dXRpb24gZm9yIHRlc3RzXG4gIHRoaXMuYmFja2VuZCA9IGJhY2tlbmQgfHwgZWlvXG59XG5cbk1pY3JvRUUubWl4aW4oQ2xpZW50KVxuXG4vLyBQdWJsaWMgQVBJXG5cbi8vIEVhY2ggdXNlIG9mIHRoZSBjbGllbnQgaXMgcmVnaXN0ZXJlZCB3aXRoIFwiYWxsb2NcIiwgYW5kIGEgZ2l2ZW4gdXNlIG9mdGVuXG4vLyBwZXJzaXN0cyB0aHJvdWdoIG1hbnkgY29ubmVjdHMgYW5kIGRpc2Nvbm5lY3RzLlxuLy8gVGhlIHN0YXRlIG1hY2hpbmUgLSBcIm1hbmFnZXJcIiAtIGhhbmRsZXMgY29ubmVjdHMgYW5kIGRpc2Nvbm5lY3RzXG5DbGllbnQucHJvdG90eXBlLmFsbG9jID0gZnVuY3Rpb24gKHVzZU5hbWUsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBpZiAoIXRoaXMuX3VzZXNbdXNlTmFtZV0pIHtcbiAgICB0aGlzLmxvZ2dlcigpLmluZm8oJ2FsbG9jOiAnLCB1c2VOYW1lKVxuICAgIHRoaXMub25jZSgncmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLmxvZ2dlcigpLmluZm8oJ3JlYWR5OiAnLCB1c2VOYW1lKVxuICAgIH0pXG5cbiAgICB0aGlzLl91c2VzW3VzZU5hbWVdID0gdHJ1ZVxuICB9XG5cbiAgY2FsbGJhY2sgJiYgdGhpcy5vbmNlKCdyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNlbGYuX3VzZXMsIHVzZU5hbWUpKSB7XG4gICAgICBjYWxsYmFjaygpXG4gICAgfVxuICB9KVxuXG4gIGlmICh0aGlzLl9pc0NvbmZpZ3VyZWQpIHtcbiAgICB0aGlzLm1hbmFnZXIuc3RhcnQoKVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX3dhaXRpbmdGb3JDb25maWd1cmUgPSB0cnVlXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBXaGVuIGRvbmUgd2l0aCBhIGdpdmVuIHVzZSBvZiB0aGUgY2xpZW50LCB1bnJlZ2lzdGVyIHRoZSB1c2Vcbi8vIE9ubHkgd2hlbiBhbGwgdXNlcyBhcmUgdW5yZWdpc3RlcmVkIGRvIHdlIGRpc2Nvbm5lY3QgdGhlIGNsaWVudFxuQ2xpZW50LnByb3RvdHlwZS5kZWFsbG9jID0gZnVuY3Rpb24gKHVzZU5hbWUpIHtcbiAgdGhpcy5sb2dnZXIoKS5pbmZvKHsgb3A6ICdkZWFsbG9jJywgdXNlTmFtZTogdXNlTmFtZSB9KVxuXG4gIGRlbGV0ZSB0aGlzLl91c2VzW3VzZU5hbWVdXG5cbiAgdmFyIHN0aWxsQWxsb2NhdGVkID0gZmFsc2VcbiAgdmFyIGtleVxuXG4gIGZvciAoa2V5IGluIHRoaXMuX3VzZXMpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX3VzZXMsIGtleSkpIHtcbiAgICAgIHN0aWxsQWxsb2NhdGVkID0gdHJ1ZVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgaWYgKCFzdGlsbEFsbG9jYXRlZCkge1xuICAgIHRoaXMubG9nZ2VyKCkuaW5mbygnY2xvc2luZyB0aGUgY29ubmVjdGlvbicpXG4gICAgdGhpcy5tYW5hZ2VyLmNsb3NlKClcbiAgfVxufVxuXG5DbGllbnQucHJvdG90eXBlLmN1cnJlbnRTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubWFuYWdlci5jdXJyZW50XG59XG5cbkNsaWVudC5wcm90b3R5cGUuY29uZmlndXJlID0gZnVuY3Rpb24gKGhhc2gpIHtcbiAgdmFyIGNvbmZpZ3VyYXRpb24gPSBoYXNoIHx8IHRoaXMuX2NvbmZpZ3VyYXRpb24gfHwgeyBhY2NvdW50TmFtZTogJycsIHVzZXJJZDogMCwgdXNlclR5cGU6IDAgfVxuICBjb25maWd1cmF0aW9uLnVzZXJUeXBlID0gY29uZmlndXJhdGlvbi51c2VyVHlwZSB8fCAwXG4gIHRoaXMuX2NvbmZpZ3VyYXRpb24gPSB0aGlzLl9tZSA9IGNvbmZpZ3VyYXRpb25cbiAgdGhpcy5faXNDb25maWd1cmVkID0gdGhpcy5faXNDb25maWd1cmVkIHx8ICEhaGFzaFxuXG4gIGlmICh0aGlzLl9pc0NvbmZpZ3VyZWQgJiYgdGhpcy5fd2FpdGluZ0ZvckNvbmZpZ3VyZSkge1xuICAgIHRoaXMuX3dhaXRpbmdGb3JDb25maWd1cmUgPSBmYWxzZVxuICAgIHRoaXMubWFuYWdlci5zdGFydCgpXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5DbGllbnQucHJvdG90eXBlLmNvbmZpZ3VyYXRpb24gPSBmdW5jdGlvbiAoY29uZmlnS2V5KSB7XG4gIGlmIChjb25maWdLZXkgaW4gdGhpcy5fY29uZmlndXJhdGlvbikge1xuICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuX2NvbmZpZ3VyYXRpb25bY29uZmlnS2V5XSkpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuXG5DbGllbnQucHJvdG90eXBlLmF0dGFjaFN0YXRlTWFjaGluZUVycm9ySGFuZGxlciA9IGZ1bmN0aW9uIChlcnJvckhhbmRsZXIpIHtcbiAgdGhpcy5tYW5hZ2VyLmF0dGFjaEVycm9ySGFuZGxlcihlcnJvckhhbmRsZXIpXG59XG5cbkNsaWVudC5wcm90b3R5cGUuY3VycmVudFVzZXJJZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2NvbmZpZ3VyYXRpb24gJiYgdGhpcy5fY29uZmlndXJhdGlvbi51c2VySWRcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5jdXJyZW50Q2xpZW50SWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9zb2NrZXQgJiYgdGhpcy5fc29ja2V0LmlkXG59XG5cbi8vIFJldHVybiB0aGUgY2hhaW5hYmxlIHNjb3BlIG9iamVjdCBmb3IgYSBnaXZlbiBtZXNzYWdlIHR5cGVcblxuQ2xpZW50LnByb3RvdHlwZS5tZXNzYWdlID0gZnVuY3Rpb24gKHNjb3BlKSB7XG4gIHJldHVybiBuZXcgU2NvcGUoJ21lc3NhZ2UnLCBzY29wZSwgdGhpcylcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5wcmVzZW5jZSA9IGZ1bmN0aW9uIChzY29wZSkge1xuICByZXR1cm4gbmV3IFNjb3BlKCdwcmVzZW5jZScsIHNjb3BlLCB0aGlzKVxufVxuXG5DbGllbnQucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uIChzY29wZSkge1xuICByZXR1cm4gbmV3IFNjb3BlKCdzdGF0dXMnLCBzY29wZSwgdGhpcylcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5zdHJlYW0gPSBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgcmV0dXJuIG5ldyBTY29wZSgnc3RyZWFtJywgc2NvcGUsIHRoaXMpXG59XG5cbkNsaWVudC5wcm90b3R5cGUuY29udHJvbCA9IGZ1bmN0aW9uIChzY29wZSkge1xuICByZXR1cm4gbmV3IFNjb3BlKCdjb250cm9sJywgc2NvcGUsIHRoaXMpXG59XG5cbi8vIE9wZXJhdGlvbnNcblxuQ2xpZW50LnByb3RvdHlwZS5uYW1lU3luYyA9IGZ1bmN0aW9uIChzY29wZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSBSZXF1ZXN0LmJ1aWxkTmFtZVN5bmMoc2NvcGUsIG9wdGlvbnMpXG4gIHJldHVybiB0aGlzLl93cml0ZShyZXF1ZXN0LCBjYWxsYmFjaylcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHNjb3BlLCByZXNvdXJjZSwgYWN0aW9uLCB2YWx1ZSwgY2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSBSZXF1ZXN0LmJ1aWxkUHVzaChzY29wZSwgcmVzb3VyY2UsIGFjdGlvbiwgdmFsdWUpXG4gIHJldHVybiB0aGlzLl93cml0ZShyZXF1ZXN0LCBjYWxsYmFjaylcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoc2NvcGUsIHZhbHVlLCBjbGllbnREYXRhLCBjYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdFxuXG4gIGNhbGxiYWNrID0gX2Nob29zZUZ1bmN0aW9uKGNsaWVudERhdGEsIGNhbGxiYWNrKVxuICBjbGllbnREYXRhID0gX251bGxJZkZ1bmN0aW9uKGNsaWVudERhdGEpXG5cbiAgcmVxdWVzdCA9IFJlcXVlc3QuYnVpbGRTZXQoc2NvcGUsIHZhbHVlLFxuICAgIHRoaXMuX2NvbmZpZ3VyYXRpb24udXNlcklkLCB0aGlzLl9jb25maWd1cmF0aW9uLnVzZXJUeXBlLFxuICAgIGNsaWVudERhdGEpXG5cbiAgcmV0dXJuIHRoaXMuX3dyaXRlKHJlcXVlc3QsIGNhbGxiYWNrKVxufVxuXG5DbGllbnQucHJvdG90eXBlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoc2NvcGUsIHZhbHVlLCBjYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdCA9IFJlcXVlc3QuYnVpbGRQdWJsaXNoKHNjb3BlLCB2YWx1ZSlcbiAgcmV0dXJuIHRoaXMuX3dyaXRlKHJlcXVlc3QsIGNhbGxiYWNrKVxufVxuXG5DbGllbnQucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChzY29wZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sgPSBfY2hvb3NlRnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spXG4gIG9wdGlvbnMgPSBfbnVsbElmRnVuY3Rpb24ob3B0aW9ucylcblxuICB2YXIgcmVxdWVzdCA9IFJlcXVlc3QuYnVpbGRTdWJzY3JpYmUoc2NvcGUsIG9wdGlvbnMpXG5cbiAgcmV0dXJuIHRoaXMuX3dyaXRlKHJlcXVlc3QsIGNhbGxiYWNrKVxufVxuXG5DbGllbnQucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKHNjb3BlLCBjYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdCA9IFJlcXVlc3QuYnVpbGRVbnN1YnNjcmliZShzY29wZSlcbiAgcmV0dXJuIHRoaXMuX3dyaXRlKHJlcXVlc3QsIGNhbGxiYWNrKVxufVxuXG4vLyBzeW5jIHJldHVybnMgdGhlIGFjdHVhbCB2YWx1ZSBvZiB0aGUgb3BlcmF0aW9uXG5DbGllbnQucHJvdG90eXBlLnN5bmMgPSBmdW5jdGlvbiAoc2NvcGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciByZXF1ZXN0LCBvblJlc3BvbnNlLCB2MVByZXNlbmNlXG5cbiAgY2FsbGJhY2sgPSBfY2hvb3NlRnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spXG4gIG9wdGlvbnMgPSBfbnVsbElmRnVuY3Rpb24ob3B0aW9ucylcblxuICByZXF1ZXN0ID0gUmVxdWVzdC5idWlsZFN5bmMoc2NvcGUsIG9wdGlvbnMpXG5cbiAgdjFQcmVzZW5jZSA9ICFvcHRpb25zICYmIHJlcXVlc3QuaXNQcmVzZW5jZSgpXG4gIG9uUmVzcG9uc2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShtZXNzYWdlKVxuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5pc0ZvcihyZXF1ZXN0KSkge1xuICAgICAgaWYgKHYxUHJlc2VuY2UpIHtcbiAgICAgICAgcmVzcG9uc2UuZm9yY2VWMVJlc3BvbnNlKClcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5nZXRNZXNzYWdlKCkpXG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHRoaXMud2hlbignZ2V0Jywgb25SZXNwb25zZSlcblxuICAvLyBzeW5jIGRvZXMgbm90IHJldHVybiBBQ0sgKGl0IHNlbmRzIGJhY2sgYSBkYXRhIG1lc3NhZ2UpXG4gIHJldHVybiB0aGlzLl93cml0ZShyZXF1ZXN0KVxufVxuXG4vLyBnZXQgcmV0dXJucyB0aGUgYWN0dWFsIHZhbHVlIG9mIHRoZSBvcGVyYXRpb25cbkNsaWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHNjb3BlLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdFxuXG4gIGNhbGxiYWNrID0gX2Nob29zZUZ1bmN0aW9uKG9wdGlvbnMsIGNhbGxiYWNrKVxuICBvcHRpb25zID0gX251bGxJZkZ1bmN0aW9uKG9wdGlvbnMpXG5cbiAgcmVxdWVzdCA9IFJlcXVlc3QuYnVpbGRHZXQoc2NvcGUsIG9wdGlvbnMpXG5cbiAgdmFyIG9uUmVzcG9uc2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShtZXNzYWdlKVxuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5pc0ZvcihyZXF1ZXN0KSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmdldE1lc3NhZ2UoKSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgdGhpcy53aGVuKCdnZXQnLCBvblJlc3BvbnNlKVxuXG4gIC8vIGdldCBkb2VzIG5vdCByZXR1cm4gQUNLIChpdCBzZW5kcyBiYWNrIGEgZGF0YSBtZXNzYWdlKVxuICByZXR1cm4gdGhpcy5fd3JpdGUocmVxdWVzdClcbn1cblxuLy8gUHJpdmF0ZSBBUElcblxudmFyIF9jaG9vc2VGdW5jdGlvbiA9IGZ1bmN0aW9uIChvcHRpb25zLCBjYWxsYmFjaykge1xuICByZXR1cm4gdHlwZW9mIChvcHRpb25zKSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMgOiBjYWxsYmFja1xufVxuXG52YXIgX251bGxJZkZ1bmN0aW9uID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiAob3B0aW9ucykgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHJldHVybiBvcHRpb25zXG59XG5cbkNsaWVudC5wcm90b3R5cGUuX2FkZExpc3RlbmVycyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gQWRkIGF1dGhlbnRpY2F0aW9uIGRhdGEgdG8gYSByZXF1ZXN0IG1lc3NhZ2U7IF93cml0ZSgpIGVtaXRzIGF1dGhlbnRpY2F0ZU1lc3NhZ2VcbiAgdGhpcy5vbignYXV0aGVudGljYXRlTWVzc2FnZScsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChtZXNzYWdlKVxuICAgIHJlcXVlc3Quc2V0QXV0aERhdGEodGhpcy5fY29uZmlndXJhdGlvbilcblxuICAgIHRoaXMuZW1pdCgnbWVzc2FnZUF1dGhlbnRpY2F0ZWQnLCByZXF1ZXN0LmdldE1lc3NhZ2UoKSlcbiAgfSlcblxuICAvLyBPbmNlIHRoZSByZXF1ZXN0IGlzIGF1dGhlbnRpY2F0ZWQsIHNlbmQgaXQgdG8gdGhlIHNlcnZlclxuICB0aGlzLm9uKCdtZXNzYWdlQXV0aGVudGljYXRlZCcsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChtZXNzYWdlKVxuICAgIHRoaXMuX3NlbmRNZXNzYWdlKHJlcXVlc3QpXG4gIH0pXG59XG5cbkNsaWVudC5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24gKHJlcXVlc3QsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGlmIChjYWxsYmFjaykge1xuICAgIHJlcXVlc3Quc2V0QXR0cignYWNrJywgdGhpcy5fYWNrQ291bnRlcisrKVxuXG4gICAgLy8gV2FpdCBhY2tcbiAgICB0aGlzLndoZW4oJ2FjaycsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobWVzc2FnZSlcbiAgICAgIHNlbGYubG9nZ2VyKCkuZGVidWcoJ2FjaycsIHJlc3BvbnNlKVxuICAgICAgaWYgKCFyZXNwb25zZS5pc0Fja0ZvcihyZXF1ZXN0KSkgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgY2FsbGJhY2socmVxdWVzdC5nZXRNZXNzYWdlKCkpXG5cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSlcbiAgfVxuXG4gIHRoaXMuZW1pdCgnYXV0aGVudGljYXRlTWVzc2FnZScsIHJlcXVlc3QuZ2V0TWVzc2FnZSgpKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbkNsaWVudC5wcm90b3R5cGUuX2JhdGNoID0gZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gIHZhciB0byA9IHJlc3BvbnNlLmdldEF0dHIoJ3RvJylcbiAgdmFyIHZhbHVlID0gcmVzcG9uc2UuZ2V0QXR0cigndmFsdWUnKVxuICB2YXIgdGltZSA9IHJlc3BvbnNlLmdldEF0dHIoJ3RpbWUnKVxuXG4gIGlmICghcmVzcG9uc2UuaXNWYWxpZCgpKSB7XG4gICAgdGhpcy5sb2dnZXIoKS5pbmZvKCdyZXNwb25zZSBpcyBpbnZhbGlkOicsIHJlc3BvbnNlLmdldE1lc3NhZ2UoKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIGRhdGFcbiAgdmFyIGxlbmd0aCA9IHZhbHVlLmxlbmd0aFxuICB2YXIgbmV3ZXN0ID0gdGltZVxuICB2YXIgY3VycmVudCA9IHRoaXMuX2NoYW5uZWxTeW5jVGltZXNbdG9dIHx8IDBcblxuICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ID0gaW5kZXggKyAyKSB7XG4gICAgZGF0YSA9IEpTT04ucGFyc2UodmFsdWVbaW5kZXhdKVxuICAgIHRpbWUgPSB2YWx1ZVtpbmRleCArIDFdXG5cbiAgICBpZiAodGltZSA+IGN1cnJlbnQpIHtcbiAgICAgIHRoaXMuZW1pdE5leHQodG8sIGRhdGEpXG4gICAgfVxuICAgIGlmICh0aW1lID4gbmV3ZXN0KSB7XG4gICAgICBuZXdlc3QgPSB0aW1lXG4gICAgfVxuICB9XG4gIHRoaXMuX2NoYW5uZWxTeW5jVGltZXNbdG9dID0gbmV3ZXN0XG59XG5cbkNsaWVudC5wcm90b3R5cGUuX2NyZWF0ZU1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbWFuYWdlciA9IHRoaXMubWFuYWdlciA9IFN0YXRlTWFjaGluZS5jcmVhdGUoKVxuXG4gIG1hbmFnZXIub24oJ2VudGVyU3RhdGUnLCBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICBzZWxmLmVtaXQoc3RhdGUpXG4gIH0pXG5cbiAgbWFuYWdlci5vbignZXZlbnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBzZWxmLmVtaXQoZXZlbnQpXG4gIH0pXG5cbiAgbWFuYWdlci5vbignY29ubmVjdCcsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIHNvY2tldCA9IHNlbGYuX3NvY2tldCA9IG5ldyBzZWxmLmJhY2tlbmQuU29ja2V0KHNlbGYuX2NvbmZpZ3VyYXRpb24pXG5cbiAgICBzb2NrZXQub25jZSgnb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzb2NrZXQgIT09IHNlbGYuX3NvY2tldCkge1xuICAgICAgICBzb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdtZXNzYWdlJylcbiAgICAgICAgc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnb3BlbicpXG4gICAgICAgIHNvY2tldC5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2Nsb3NlJylcbiAgICAgICAgc29ja2V0LmNsb3NlKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHNlbGYubG9nZ2VyKCkuZGVidWcoJ3NvY2tldCBvcGVuJywgc29ja2V0LmlkKVxuICAgICAgbWFuYWdlci5lc3RhYmxpc2hlZCgpXG4gICAgfSlcblxuICAgIHNvY2tldC5vbmNlKCdjbG9zZScsIGZ1bmN0aW9uIChyZWFzb24sIGRlc2NyaXB0aW9uKSB7XG4gICAgICBzZWxmLmxvZ2dlcigpLmRlYnVnKCdzb2NrZXQgY2xvc2VkJywgc29ja2V0LmlkLCByZWFzb24sIGRlc2NyaXB0aW9uKVxuICAgICAgc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnbWVzc2FnZScpXG4gICAgICAvLyBQYXRjaCBmb3IgcG9sbGluZy14aHIgY29udGludWluZyB0byBwb2xsIGFmdGVyIHNvY2tldCBjbG9zZSAoSFRUUDpQT1NUXG4gICAgICAvLyBmYWlsdXJlKS4gIHNvY2tldC50cmFuc3BvcnQgaXMgaW4gZXJyb3IgYnV0IG5vdCBjbG9zZWQsIHNvIGlmIGEgc3Vic2VxdWVudFxuICAgICAgLy8gcG9sbCBzdWNjZWVkcywgdGhlIHRyYW5zcG9ydCByZW1haW5zIG9wZW4gYW5kIHBvbGxpbmcgdW50aWwgc2VydmVyIGNsb3Nlc1xuICAgICAgLy8gdGhlIHNvY2tldC5cbiAgICAgIGlmIChzb2NrZXQudHJhbnNwb3J0KSB7XG4gICAgICAgIHNvY2tldC50cmFuc3BvcnQuY2xvc2UoKVxuICAgICAgfVxuXG4gICAgICBpZiAoc29ja2V0ID09PSBzZWxmLl9zb2NrZXQpIHtcbiAgICAgICAgc2VsZi5fc29ja2V0ID0gbnVsbFxuICAgICAgICBpZiAoIW1hbmFnZXIuaXMoJ2Nsb3NlZCcpKSB7XG4gICAgICAgICAgbWFuYWdlci5kaXNjb25uZWN0KClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBzb2NrZXQub24oJ21lc3NhZ2UnLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgaWYgKHNvY2tldCAhPT0gc2VsZi5fc29ja2V0KSB7XG4gICAgICAgIHNvY2tldC5yZW1vdmVBbGxMaXN0ZW5lcnMoJ21lc3NhZ2UnKVxuICAgICAgICBzb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdvcGVuJylcbiAgICAgICAgc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnY2xvc2UnKVxuICAgICAgICBzb2NrZXQuY2xvc2UoKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHNlbGYuX21lc3NhZ2VSZWNlaXZlZChtZXNzYWdlKVxuICAgIH0pXG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBzZWxmLmVtaXQoJ3NvY2tldEVycm9yJywgZXJyb3IpXG4gICAgfSlcblxuICAgIG1hbmFnZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdjbG9zZScpXG4gICAgbWFuYWdlci5vbmNlKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHNvY2tldC5jbG9zZSgpXG4gICAgfSlcbiAgfSlcblxuICBtYW5hZ2VyLm9uKCdhY3RpdmF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc2VsZi5fc29ja2V0ID09PSBudWxsKSB7XG4gICAgICBtYW5hZ2VyLmRpc2Nvbm5lY3QoKVxuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLl9pZGVudGl0eVNldCgpXG4gICAgICBzZWxmLl9yZXN0b3JlKClcbiAgICAgIHNlbGYuZW1pdCgncmVhZHknKVxuICAgIH1cbiAgfSlcblxuICBtYW5hZ2VyLm9uKCdhdXRoZW50aWNhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gb3JkZXIgdG8gZXN0YWJsaXNoIGFuIGF1dGhlbnRpY2F0aW9uIHByb3RvY29sXG4gICAgbWFuYWdlci5hY3RpdmF0ZSgpXG4gIH0pXG5cbiAgbWFuYWdlci5vbignZGlzY29ubmVjdCcsIGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9yZXN0b3JlUmVxdWlyZWQgPSB0cnVlXG4gICAgc2VsZi5faWRlbnRpdHlTZXRSZXF1aXJlZCA9IHRydWVcblxuICAgIHZhciBzb2NrZXQgPSBzZWxmLl9zb2NrZXRcbiAgICBpZiAoc29ja2V0KSB7XG4gICAgICAvLyBJZiB5b3UgcmVhY2ggZGlzY29ubmVjdCB3aXRoIGEgc29ja2V0IG9iaixcbiAgICAgIC8vIGl0IG1pZ2h0IGJlIGZyb20gc3RhcnRHdWFyZCAob3BlbiB0aW1lb3V0IHJlYWNoZWQpXG4gICAgICAvLyBDbGVhciBvdXQgdGhlIGN1cnJlbnQgYXR0ZW1wdCB0byBnZXQgYSBzb2NrZXRcbiAgICAgIC8vIGFuZCBjbG9zZSBpdCBpZiBpdCBvcGVuc1xuICAgICAgc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnbWVzc2FnZScpXG4gICAgICBzb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdvcGVuJylcbiAgICAgIHNvY2tldC5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2Nsb3NlJylcbiAgICAgIHNvY2tldC5vbmNlKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmxvZ2dlcigpLmRlYnVnKCdzb2NrZXQgb3BlbiwgY2xvc2luZyBpdCcsIHNvY2tldC5pZClcbiAgICAgICAgc29ja2V0LmNsb3NlKClcbiAgICAgIH0pXG4gICAgICBzZWxmLl9zb2NrZXQgPSBudWxsXG4gICAgfVxuICB9KVxuXG4gIG1hbmFnZXIub24oJ2JhY2tvZmYnLCBmdW5jdGlvbiAodGltZSwgc3RlcCkge1xuICAgIHNlbGYuZW1pdCgnYmFja29mZicsIHRpbWUsIHN0ZXApXG4gIH0pXG59XG5cbi8vIE1lbW9yaXplIHN1YnNjcmlwdGlvbnMgYW5kIHByZXNlbmNlIHN0YXRlczsgcmV0dXJuIFwidHJ1ZVwiIGZvciBhIG1lc3NhZ2UgdGhhdFxuLy8gYWRkcyB0byB0aGUgbWVtb3JpemVkIHN1YnNjcmlwdGlvbnMgb3IgcHJlc2VuY2VzXG5DbGllbnQucHJvdG90eXBlLl9tZW1vcml6ZSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gIHZhciBvcCA9IHJlcXVlc3QuZ2V0QXR0cignb3AnKVxuICB2YXIgdG8gPSByZXF1ZXN0LmdldEF0dHIoJ3RvJylcbiAgdmFyIHZhbHVlID0gcmVxdWVzdC5nZXRBdHRyKCd2YWx1ZScpXG5cbiAgc3dpdGNoIChvcCkge1xuICAgIGNhc2UgJ3Vuc3Vic2NyaWJlJzpcbiAgICAgIC8vIFJlbW92ZSBmcm9tIHF1ZXVlXG4gICAgICBpZiAodGhpcy5fc3Vic2NyaXB0aW9uc1t0b10pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3N1YnNjcmlwdGlvbnNbdG9dXG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgY2FzZSAnc3luYyc6XG4gICAgY2FzZSAnc3Vic2NyaWJlJzpcbiAgICAgIC8vIEEgY2F0Y2ggZm9yIHdoZW4gKnN1YnNjcmliZSogaXMgY2FsbGVkIGFmdGVyICpzeW5jKlxuICAgICAgaWYgKHRoaXMuX3N1YnNjcmlwdGlvbnNbdG9dICE9PSAnc3luYycpIHtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9uc1t0b10gPSBvcFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWVcblxuICAgIGNhc2UgJ3NldCc6XG4gICAgICBpZiAocmVxdWVzdC5pc1ByZXNlbmNlKCkpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSAnb2ZmbGluZScpIHtcbiAgICAgICAgICB0aGlzLl9wcmVzZW5jZXNbdG9dID0gdmFsdWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fcHJlc2VuY2VzW3RvXVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5fcmVzdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGl0ZW1cbiAgdmFyIHRvXG4gIHZhciBjb3VudHMgPSB7IHN1YnNjcmlwdGlvbnM6IDAsIHByZXNlbmNlczogMCwgbWVzc2FnZXM6IDAgfVxuICBpZiAodGhpcy5fcmVzdG9yZVJlcXVpcmVkKSB7XG4gICAgdGhpcy5fcmVzdG9yZVJlcXVpcmVkID0gZmFsc2VcblxuICAgIGZvciAodG8gaW4gdGhpcy5fc3Vic2NyaXB0aW9ucykge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9zdWJzY3JpcHRpb25zLCB0bykpIHtcbiAgICAgICAgaXRlbSA9IHRoaXMuX3N1YnNjcmlwdGlvbnNbdG9dXG4gICAgICAgIHRoaXNbaXRlbV0odG8pXG4gICAgICAgIGNvdW50cy5zdWJzY3JpcHRpb25zICs9IDFcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHRvIGluIHRoaXMuX3ByZXNlbmNlcykge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9wcmVzZW5jZXMsIHRvKSkge1xuICAgICAgICB0aGlzLnNldCh0bywgdGhpcy5fcHJlc2VuY2VzW3RvXSlcbiAgICAgICAgY291bnRzLnByZXNlbmNlcyArPSAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgd2hpbGUgKHRoaXMuX3F1ZXVlZFJlcXVlc3RzLmxlbmd0aCkge1xuICAgICAgdGhpcy5fd3JpdGUodGhpcy5fcXVldWVkUmVxdWVzdHMuc2hpZnQoKSlcbiAgICAgIGNvdW50cy5tZXNzYWdlcyArPSAxXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIoKS5kZWJ1ZygncmVzdG9yZS1zdWJzY3JpcHRpb25zJywgY291bnRzKVxuICB9XG59XG5cbkNsaWVudC5wcm90b3R5cGUuX3NlbmRNZXNzYWdlID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgdmFyIG1lbW9yaXplZCA9IHRoaXMuX21lbW9yaXplKHJlcXVlc3QpXG4gIHZhciBhY2sgPSByZXF1ZXN0LmdldEF0dHIoJ2FjaycpXG5cbiAgdGhpcy5lbWl0KCdtZXNzYWdlOm91dCcsIHJlcXVlc3QuZ2V0TWVzc2FnZSgpKVxuXG4gIGlmICh0aGlzLl9zb2NrZXQgJiYgdGhpcy5tYW5hZ2VyLmlzKCdhY3RpdmF0ZWQnKSkge1xuICAgIHRoaXMuX3NvY2tldC5zZW5kUGFja2V0KCdtZXNzYWdlJywgcmVxdWVzdC5wYXlsb2FkKCkpXG4gIH0gZWxzZSBpZiAodGhpcy5faXNDb25maWd1cmVkKSB7XG4gICAgdGhpcy5fcmVzdG9yZVJlcXVpcmVkID0gdHJ1ZVxuICAgIHRoaXMuX2lkZW50aXR5U2V0UmVxdWlyZWQgPSB0cnVlXG4gICAgaWYgKCFtZW1vcml6ZWQgfHwgYWNrKSB7XG4gICAgICB0aGlzLl9xdWV1ZWRSZXF1ZXN0cy5wdXNoKHJlcXVlc3QpXG4gICAgfVxuICAgIHRoaXMubWFuYWdlci5jb25uZWN0V2hlbkFibGUoKVxuICB9XG59XG5cbkNsaWVudC5wcm90b3R5cGUuX21lc3NhZ2VSZWNlaXZlZCA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKEpTT04ucGFyc2UobXNnKSlcbiAgdmFyIG9wID0gcmVzcG9uc2UuZ2V0QXR0cignb3AnKVxuICB2YXIgdG8gPSByZXNwb25zZS5nZXRBdHRyKCd0bycpXG5cbiAgdGhpcy5lbWl0KCdtZXNzYWdlOmluJywgcmVzcG9uc2UuZ2V0TWVzc2FnZSgpKVxuXG4gIHN3aXRjaCAob3ApIHtcbiAgICBjYXNlICdlcnInOlxuICAgIGNhc2UgJ2Fjayc6XG4gICAgY2FzZSAnZ2V0JzpcbiAgICAgIHRoaXMuZW1pdE5leHQob3AsIHJlc3BvbnNlLmdldE1lc3NhZ2UoKSlcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlICdzeW5jJzpcbiAgICAgIHRoaXMuX2JhdGNoKHJlc3BvbnNlKVxuICAgICAgYnJlYWtcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLmVtaXROZXh0KHRvLCByZXNwb25zZS5nZXRNZXNzYWdlKCkpXG4gIH1cbn1cblxuQ2xpZW50LnByb3RvdHlwZS5lbWl0TmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICBpbW1lZGlhdGUoZnVuY3Rpb24gKCkgeyBzZWxmLmVtaXQuYXBwbHkoc2VsZiwgYXJncykgfSlcbn1cblxuQ2xpZW50LnByb3RvdHlwZS5faWRlbnRpdHlTZXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9pZGVudGl0eVNldFJlcXVpcmVkKSB7XG4gICAgdGhpcy5faWRlbnRpdHlTZXRSZXF1aXJlZCA9IGZhbHNlXG5cbiAgICBpZiAoIXRoaXMubmFtZSkge1xuICAgICAgdGhpcy5uYW1lID0gdGhpcy5fdXVpZFY0R2VuZXJhdGUoKVxuICAgIH1cblxuICAgIC8vIFNlbmQgbXNnIHRoYXQgYXNzb2NpYXRlcyB0aGlzLmlkIHdpdGggY3VycmVudCBuYW1lXG4gICAgdmFyIGFzc29jaWF0aW9uID0geyBpZDogdGhpcy5fc29ja2V0LmlkLCBuYW1lOiB0aGlzLm5hbWUgfVxuICAgIHZhciBjbGllbnRWZXJzaW9uID0gZ2V0Q2xpZW50VmVyc2lvbigpXG4gICAgdmFyIG9wdGlvbnMgPSB7IGFzc29jaWF0aW9uOiBhc3NvY2lhdGlvbiwgY2xpZW50VmVyc2lvbjogY2xpZW50VmVyc2lvbiB9XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICB0aGlzLmNvbnRyb2woJ2NsaWVudE5hbWUnKS5uYW1lU3luYyhvcHRpb25zLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgc2VsZi5sb2dnZXIoJ25hbWVTeW5jIG1lc3NhZ2U6ICcgKyBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSlcbiAgICB9KVxuICB9XG59XG5cbi8vIFZhcmlhbnQgKGJ5IEplZmYgV2FyZCkgb2YgY29kZSBiZWhpbmQgbm9kZS11dWlkLCBidXQgYXZvaWRzIG5lZWQgZm9yIG1vZHVsZVxudmFyIGx1dCA9IFtdXG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7IGx1dFtpXSA9IChpIDwgMTYgPyAnMCcgOiAnJykgKyAoaSkudG9TdHJpbmcoMTYpIH1cbkNsaWVudC5wcm90b3R5cGUuX3V1aWRWNEdlbmVyYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZDAgPSBNYXRoLnJhbmRvbSgpICogMHhmZmZmZmZmZiB8IDBcbiAgdmFyIGQxID0gTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmZmYgfCAwXG4gIHZhciBkMiA9IE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmIHwgMFxuICB2YXIgZDMgPSBNYXRoLnJhbmRvbSgpICogMHhmZmZmZmZmZiB8IDBcbiAgcmV0dXJuIGx1dFtkMCAmIDB4ZmZdICsgbHV0W2QwID4+IDggJiAweGZmXSArIGx1dFtkMCA+PiAxNiAmIDB4ZmZdICsgbHV0W2QwID4+IDI0ICYgMHhmZl0gKyAnLScgK1xuICBsdXRbZDEgJiAweGZmXSArIGx1dFtkMSA+PiA4ICYgMHhmZl0gKyAnLScgKyBsdXRbZDEgPj4gMTYgJiAweDBmIHwgMHg0MF0gKyBsdXRbZDEgPj4gMjQgJiAweGZmXSArICctJyArXG4gIGx1dFtkMiAmIDB4M2YgfCAweDgwXSArIGx1dFtkMiA+PiA4ICYgMHhmZl0gKyAnLScgKyBsdXRbZDIgPj4gMTYgJiAweGZmXSArIGx1dFtkMiA+PiAyNCAmIDB4ZmZdICtcbiAgbHV0W2QzICYgMHhmZl0gKyBsdXRbZDMgPj4gOCAmIDB4ZmZdICsgbHV0W2QzID4+IDE2ICYgMHhmZl0gKyBsdXRbZDMgPj4gMjQgJiAweGZmXVxufVxuXG5DbGllbnQuc2V0QmFja2VuZCA9IGZ1bmN0aW9uIChsaWIpIHsgZWlvID0gbGliIH1cblxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnRcbiIsImZ1bmN0aW9uIFNjb3BlICh0eXBlTmFtZSwgc2NvcGUsIGNsaWVudCkge1xuICB0aGlzLmNsaWVudCA9IGNsaWVudFxuICB0aGlzLnByZWZpeCA9IHRoaXMuX2J1aWxkU2NvcGVQcmVmaXgodHlwZU5hbWUsIHNjb3BlLCBjbGllbnQuY29uZmlndXJhdGlvbignYWNjb3VudE5hbWUnKSlcbn1cblxudmFyIHByb3BzID0gWydzZXQnLCAnZ2V0JywgJ3N1YnNjcmliZScsICd1bnN1YnNjcmliZScsICdwdWJsaXNoJywgJ3B1c2gnLCAnc3luYycsXG4gICdvbicsICdvbmNlJywgJ3doZW4nLCAncmVtb3ZlTGlzdGVuZXInLCAncmVtb3ZlQWxsTGlzdGVuZXJzJywgJ25hbWVTeW5jJ11cblxudmFyIGluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuICBTY29wZS5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzKVxuICAgIGFyZ3MudW5zaGlmdCh0aGlzLnByZWZpeClcbiAgICB0aGlzLmNsaWVudFtuYW1lXS5hcHBseSh0aGlzLmNsaWVudCwgYXJncylcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbmZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgaW5pdChwcm9wc1tpXSlcbn1cblxuU2NvcGUucHJvdG90eXBlLl9idWlsZFNjb3BlUHJlZml4ID0gZnVuY3Rpb24gKHR5cGVOYW1lLCBzY29wZSwgYWNjb3VudE5hbWUpIHtcbiAgcmV0dXJuIHR5cGVOYW1lICsgJzovJyArIGFjY291bnROYW1lICsgJy8nICsgc2NvcGVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTY29wZVxuIiwidmFyIGxvZyA9IHJlcXVpcmUoJ21pbmlsb2cnKSgncmFkYXJfc3RhdGUnKVxudmFyIE1pY3JvRUUgPSByZXF1aXJlKCdtaWNyb2VlJylcbnZhciBCYWNrb2ZmID0gcmVxdWlyZSgnLi9iYWNrb2ZmJylcbnZhciBNYWNoaW5lID0gcmVxdWlyZSgnc2ZzbScpXG5cbmZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBiYWNrb2ZmID0gbmV3IEJhY2tvZmYoKVxuICB2YXIgbWFjaGluZSA9IE1hY2hpbmUuY3JlYXRlKHtcbiAgICBlcnJvcjogZnVuY3Rpb24gKG5hbWUsIGZyb20sIHRvLCBhcmdzLCB0eXBlLCBtZXNzYWdlLCBlcnIpIHtcbiAgICAgIGxvZy53YXJuKCdzdGF0ZS1tYWNoaW5lLWVycm9yJywgYXJndW1lbnRzKVxuXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLmVycm9ySGFuZGxlcikge1xuICAgICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyKG5hbWUsIGZyb20sIHRvLCBhcmdzLCB0eXBlLCBtZXNzYWdlLCBlcnIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZXZlbnRzOiBbXG4gICAgICB7IG5hbWU6ICdjb25uZWN0JywgZnJvbTogWydvcGVuZWQnLCAnZGlzY29ubmVjdGVkJ10sIHRvOiAnY29ubmVjdGluZycgfSxcbiAgICAgIHsgbmFtZTogJ2VzdGFibGlzaGVkJywgZnJvbTogJ2Nvbm5lY3RpbmcnLCB0bzogJ2Nvbm5lY3RlZCcgfSxcbiAgICAgIHsgbmFtZTogJ2F1dGhlbnRpY2F0ZScsIGZyb206ICdjb25uZWN0ZWQnLCB0bzogJ2F1dGhlbnRpY2F0aW5nJyB9LFxuICAgICAgeyBuYW1lOiAnYWN0aXZhdGUnLCBmcm9tOiBbJ2F1dGhlbnRpY2F0aW5nJywgJ2FjdGl2YXRlZCddLCB0bzogJ2FjdGl2YXRlZCcgfSxcbiAgICAgIHsgbmFtZTogJ2Rpc2Nvbm5lY3QnLCBmcm9tOiBNYWNoaW5lLldJTERDQVJELCB0bzogJ2Rpc2Nvbm5lY3RlZCcgfSxcbiAgICAgIHsgbmFtZTogJ2Nsb3NlJywgZnJvbTogTWFjaGluZS5XSUxEQ0FSRCwgdG86ICdjbG9zZWQnIH0sXG4gICAgICB7IG5hbWU6ICdvcGVuJywgZnJvbTogWydub25lJywgJ2Nsb3NlZCddLCB0bzogJ29wZW5lZCcgfVxuICAgIF0sXG5cbiAgICBjYWxsYmFja3M6IHtcbiAgICAgIG9uZXZlbnQ6IGZ1bmN0aW9uIChldmVudCwgZnJvbSwgdG8pIHtcbiAgICAgICAgbG9nLmRlYnVnKCdmcm9tICcgKyBmcm9tICsgJyAtPiAnICsgdG8gKyAnLCBldmVudDogJyArIGV2ZW50KVxuXG4gICAgICAgIHRoaXMuZW1pdCgnZXZlbnQnLCBldmVudClcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCBhcmd1bWVudHMpXG4gICAgICB9LFxuXG4gICAgICBvbnN0YXRlOiBmdW5jdGlvbiAoZXZlbnQsIGZyb20sIHRvKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnZW50ZXJTdGF0ZScsIHRvKVxuICAgICAgICB0aGlzLmVtaXQodG8sIGFyZ3VtZW50cylcbiAgICAgIH0sXG5cbiAgICAgIG9uY29ubmVjdGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN0YXJ0R3VhcmQoKVxuICAgICAgfSxcblxuICAgICAgb25lc3RhYmxpc2hlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhbmNlbEd1YXJkKClcbiAgICAgICAgYmFja29mZi5zdWNjZXNzKClcbiAgICAgICAgdGhpcy5hdXRoZW50aWNhdGUoKVxuICAgICAgfSxcblxuICAgICAgb25jbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhbmNlbEd1YXJkKClcbiAgICAgIH0sXG5cbiAgICAgIG9uZGlzY29ubmVjdGVkOiBmdW5jdGlvbiAoZXZlbnQsIGZyb20sIHRvKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lcikge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcilcbiAgICAgICAgICBkZWxldGUgdGhpcy5fdGltZXJcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0aW1lID0gYmFja29mZi5nZXQoKVxuICAgICAgICBiYWNrb2ZmLmluY3JlbWVudCgpXG5cbiAgICAgICAgdGhpcy5lbWl0KCdiYWNrb2ZmJywgdGltZSwgYmFja29mZi5mYWlsdXJlcylcbiAgICAgICAgbG9nLmRlYnVnKCdyZWNvbm5lY3RpbmcgaW4gJyArIHRpbWUgKyAnbXNlYycpXG5cbiAgICAgICAgdGhpcy5fdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWxldGUgbWFjaGluZS5fdGltZXJcbiAgICAgICAgICBpZiAobWFjaGluZS5pcygnZGlzY29ubmVjdGVkJykpIHtcbiAgICAgICAgICAgIG1hY2hpbmUuY29ubmVjdCgpXG4gICAgICAgICAgfVxuICAgICAgICB9LCB0aW1lKVxuXG4gICAgICAgIGlmIChiYWNrb2ZmLmlzVW5hdmFpbGFibGUoKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd1bmF2YWlsYWJsZScpXG4gICAgICAgICAgdGhpcy5lbWl0KCd1bmF2YWlsYWJsZScpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgLy8gRm9yIHRlc3RpbmdcbiAgbWFjaGluZS5fYmFja29mZiA9IGJhY2tvZmZcbiAgbWFjaGluZS5fY29ubmVjdFRpbWVvdXQgPSAxMDAwMFxuXG4gIGZvciAodmFyIHByb3BlcnR5IGluIE1pY3JvRUUucHJvdG90eXBlKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChNaWNyb0VFLnByb3RvdHlwZSwgcHJvcGVydHkpKSB7XG4gICAgICBtYWNoaW5lW3Byb3BlcnR5XSA9IE1pY3JvRUUucHJvdG90eXBlW3Byb3BlcnR5XVxuICAgIH1cbiAgfVxuXG4gIG1hY2hpbmUub3BlbigpXG5cbiAgbWFjaGluZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pcygnY2xvc2VkJykpIHtcbiAgICAgIHRoaXMub3BlbigpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXMoJ2FjdGl2YXRlZCcpKSB7XG4gICAgICB0aGlzLmFjdGl2YXRlKClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb25uZWN0V2hlbkFibGUoKVxuICAgIH1cbiAgfVxuXG4gIG1hY2hpbmUuc3RhcnRHdWFyZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBtYWNoaW5lLmNhbmNlbEd1YXJkKClcbiAgICBtYWNoaW5lLl9ndWFyZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmluZm8oJ3N0YXJ0R3VhcmQ6IGRpc2Nvbm5lY3QgZnJvbSB0aW1lb3V0JylcbiAgICAgIG1hY2hpbmUuZGlzY29ubmVjdCgpXG4gICAgfSwgbWFjaGluZS5fY29ubmVjdFRpbWVvdXQpXG4gIH1cblxuICBtYWNoaW5lLmNhbmNlbEd1YXJkID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChtYWNoaW5lLl9ndWFyZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KG1hY2hpbmUuX2d1YXJkKVxuICAgICAgZGVsZXRlIG1hY2hpbmUuX2d1YXJkXG4gICAgfVxuICB9XG5cbiAgbWFjaGluZS5jb25uZWN0V2hlbkFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCEodGhpcy5pcygnY29ubmVjdGVkJykgfHwgdGhpcy5pcygnYWN0aXZhdGVkJykpKSB7XG4gICAgICBpZiAodGhpcy5jYW4oJ2Nvbm5lY3QnKSkge1xuICAgICAgICB0aGlzLmNvbm5lY3QoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vbmNlKCdlbnRlclN0YXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIG1hY2hpbmUuY29ubmVjdFdoZW5BYmxlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBtYWNoaW5lLmF0dGFjaEVycm9ySGFuZGxlciA9IGZ1bmN0aW9uIChlcnJvckhhbmRsZXIpIHtcbiAgICBpZiAodHlwZW9mIGVycm9ySGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5lcnJvckhhbmRsZXIgPSBlcnJvckhhbmRsZXJcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLndhcm4oJ2Vycm9ySGFuZGxlciBtdXN0IGJlIGEgZnVuY3Rpb24nKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYWNoaW5lXG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBjcmVhdGU6IGNyZWF0ZSB9XG4iLCJmdW5jdGlvbiBNKCkgeyB0aGlzLl9ldmVudHMgPSB7fTsgfVxuTS5wcm90b3R5cGUgPSB7XG4gIG9uOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZSA9IHRoaXMuX2V2ZW50cztcbiAgICAoZVtldl0gfHwgKGVbZXZdID0gW10pKS5wdXNoKGNiKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uKGV2LCBjYikge1xuICAgIHZhciBlID0gdGhpcy5fZXZlbnRzW2V2XSB8fCBbXSwgaTtcbiAgICBmb3IoaSA9IGUubGVuZ3RoLTE7IGkgPj0gMCAmJiBlW2ldOyBpLS0pe1xuICAgICAgaWYoZVtpXSA9PT0gY2IgfHwgZVtpXS5jYiA9PT0gY2IpIHsgZS5zcGxpY2UoaSwgMSk7IH1cbiAgICB9XG4gIH0sXG4gIHJlbW92ZUFsbExpc3RlbmVyczogZnVuY3Rpb24oZXYpIHtcbiAgICBpZighZXYpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cbiAgICBlbHNlIHsgdGhpcy5fZXZlbnRzW2V2XSAmJiAodGhpcy5fZXZlbnRzW2V2XSA9IFtdKTsgfVxuICB9LFxuICBsaXN0ZW5lcnM6IGZ1bmN0aW9uKGV2KSB7XG4gICAgcmV0dXJuICh0aGlzLl9ldmVudHMgPyB0aGlzLl9ldmVudHNbZXZdIHx8IFtdIDogW10pO1xuICB9LFxuICBlbWl0OiBmdW5jdGlvbihldikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgaSwgZSA9IHRoaXMuX2V2ZW50c1tldl0gfHwgW107XG4gICAgZm9yKGkgPSBlLmxlbmd0aC0xOyBpID49IDAgJiYgZVtpXTsgaS0tKXtcbiAgICAgIGVbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB3aGVuOiBmdW5jdGlvbihldiwgY2IpIHtcbiAgICByZXR1cm4gdGhpcy5vbmNlKGV2LCBjYiwgdHJ1ZSk7XG4gIH0sXG4gIG9uY2U6IGZ1bmN0aW9uKGV2LCBjYiwgd2hlbikge1xuICAgIGlmKCFjYikgcmV0dXJuIHRoaXM7XG4gICAgZnVuY3Rpb24gYygpIHtcbiAgICAgIGlmKCF3aGVuKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2LCBjKTtcbiAgICAgIGlmKGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgJiYgd2hlbikgdGhpcy5yZW1vdmVMaXN0ZW5lcihldiwgYyk7XG4gICAgfVxuICAgIGMuY2IgPSBjYjtcbiAgICB0aGlzLm9uKGV2LCBjKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcbk0ubWl4aW4gPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBvID0gTS5wcm90b3R5cGUsIGs7XG4gIGZvciAoayBpbiBvKSB7XG4gICAgby5oYXNPd25Qcm9wZXJ0eShrKSAmJiAoZGVzdC5wcm90b3R5cGVba10gPSBvW2tdKTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gTTtcbiIsImNsYXNzIEJhdGNoIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gWy4uLmFyZ3VtZW50c11cbiAgICB0aGlzLnZhbHVlID0gbWVzc2FnZXNcbiAgICB0aGlzLm9wID0gJ2JhdGNoJ1xuICB9XG5cbiAgYWRkIChtZXNzYWdlKSB7XG4gICAgdGhpcy52YWx1ZS5wdXNoKG1lc3NhZ2UpXG4gIH1cblxuICBnZXQgbGVuZ3RoICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5sZW5ndGhcbiAgfVxuXG4gIHRvSlNPTiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wOiB0aGlzLm9wLFxuICAgICAgbGVuZ3RoOiB0aGlzLmxlbmd0aCxcbiAgICAgIHZhbHVlOiB0aGlzLnZhbHVlXG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmF0Y2hcbiIsImNvbnN0IFJlcXVlc3QgPSByZXF1aXJlKCcuL21lc3NhZ2VfcmVxdWVzdCcpXG5jb25zdCBSZXNwb25zZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV9yZXNwb25zZScpXG5jb25zdCBCYXRjaCA9IHJlcXVpcmUoJy4vYmF0Y2hfbWVzc2FnZScpXG5jb25zdCBSYWRhck1lc3NhZ2UgPSB7fVxuXG5SYWRhck1lc3NhZ2UuQmF0Y2ggPSBCYXRjaFxuUmFkYXJNZXNzYWdlLlJlcXVlc3QgPSBSZXF1ZXN0XG5SYWRhck1lc3NhZ2UuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhZGFyTWVzc2FnZVxuIiwiY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnbWluaWxvZycpKCdtZXNzYWdlOnJlcXVlc3QnKVxuXG5jb25zdCBvcFRhYmxlID0ge1xuICBjb250cm9sOiBbJ25hbWVTeW5jJywgJ2Rpc2Nvbm5lY3QnXSxcbiAgbWVzc2FnZTogWydwdWJsaXNoJywgJ3N1YnNjcmliZScsICdzeW5jJywgJ3Vuc3Vic2NyaWJlJ10sXG4gIHByZXNlbmNlOiBbJ2dldCcsICdzZXQnLCAnc3Vic2NyaWJlJywgJ3N5bmMnLCAndW5zdWJzY3JpYmUnXSxcbiAgc3RhdHVzOiBbJ2dldCcsICdzZXQnLCAnc3Vic2NyaWJlJywgJ3N5bmMnLCAndW5zdWJzY3JpYmUnXSxcbiAgc3RyZWFtOiBbJ2dldCcsICdwdXNoJywgJ3N1YnNjcmliZScsICdzeW5jJywgJ3Vuc3Vic2NyaWJlJ11cbn1cblxuY29uc3QgUmVxdWVzdCA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2VcblxuICBpZiAoIXRoaXMuX2lzVmFsaWQoKSkge1xuICAgIGxvZ2dlci5lcnJvcignaW52YWxpZCByZXF1ZXN0LiBvcDogJyArIHRoaXMubWVzc2FnZS5vcCArICc7IHRvOiAnICsgdGhpcy5tZXNzYWdlLnRvKVxuICAgIHRoaXMubWVzc2FnZSA9IHt9XG4gIH1cbn1cblxuUmVxdWVzdC5idWlsZEdldCA9IGZ1bmN0aW9uIChzY29wZSwgb3B0aW9ucywgbWVzc2FnZSA9IHsgb3A6ICdnZXQnLCB0bzogc2NvcGUgfSkge1xuICByZXR1cm4gbmV3IFJlcXVlc3QobWVzc2FnZSkuc2V0T3B0aW9ucyhvcHRpb25zKVxufVxuXG5SZXF1ZXN0LmJ1aWxkUHVibGlzaCA9IGZ1bmN0aW9uIChzY29wZSwgdmFsdWUsIG1lc3NhZ2UgPSB7IG9wOiAncHVibGlzaCcsIHRvOiBzY29wZSB9KSB7XG4gIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChtZXNzYWdlKVxuICByZXF1ZXN0LnNldEF0dHIoJ3ZhbHVlJywgdmFsdWUpXG5cbiAgcmV0dXJuIHJlcXVlc3Rcbn1cblxuUmVxdWVzdC5idWlsZFB1c2ggPSBmdW5jdGlvbiAoc2NvcGUsIHJlc291cmNlLCBhY3Rpb24sIHZhbHVlLCBtZXNzYWdlID0geyBvcDogJ3B1c2gnLCB0bzogc2NvcGUgfSkge1xuICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QobWVzc2FnZSlcbiAgcmVxdWVzdC5zZXRBdHRyKCdyZXNvdXJjZScsIHJlc291cmNlKVxuICByZXF1ZXN0LnNldEF0dHIoJ2FjdGlvbicsIGFjdGlvbilcbiAgcmVxdWVzdC5zZXRBdHRyKCd2YWx1ZScsIHZhbHVlKVxuXG4gIHJldHVybiByZXF1ZXN0XG59XG5cblJlcXVlc3QuYnVpbGROYW1lU3luYyA9IGZ1bmN0aW9uIChzY29wZSwgb3B0aW9ucywgbWVzc2FnZSA9IHsgb3A6ICduYW1lU3luYycsIHRvOiBzY29wZSB9KSB7XG4gIHJldHVybiBuZXcgUmVxdWVzdChtZXNzYWdlKS5zZXRPcHRpb25zKG9wdGlvbnMpXG59XG5cblJlcXVlc3QuYnVpbGRTZXQgPSBmdW5jdGlvbiAoc2NvcGUsIHZhbHVlLCBrZXksIHVzZXJUeXBlLCBjbGllbnREYXRhLCBtZXNzYWdlID0geyBvcDogJ3NldCcsIHRvOiBzY29wZSB9KSB7XG4gIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChtZXNzYWdlKVxuICByZXF1ZXN0LnNldEF0dHIoJ3ZhbHVlJywgdmFsdWUpXG4gIHJlcXVlc3Quc2V0QXR0cigna2V5Jywga2V5KVxuICByZXF1ZXN0LnNldEF0dHIoJ3R5cGUnLCB1c2VyVHlwZSlcbiAgaWYgKGNsaWVudERhdGEpIHtcbiAgICByZXF1ZXN0LnNldEF0dHIoJ2NsaWVudERhdGEnLCBjbGllbnREYXRhKVxuICB9XG5cbiAgcmV0dXJuIHJlcXVlc3Rcbn1cblxuUmVxdWVzdC5idWlsZFN5bmMgPSBmdW5jdGlvbiAoc2NvcGUsIG9wdGlvbnMsIG1lc3NhZ2UgPSB7IG9wOiAnc3luYycsIHRvOiBzY29wZSB9KSB7XG4gIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChtZXNzYWdlKS5zZXRPcHRpb25zKG9wdGlvbnMpXG4gIGlmIChyZXF1ZXN0LmlzUHJlc2VuY2UoKSkge1xuICAgIHJlcXVlc3QuZm9yY2VWMlN5bmMob3B0aW9ucylcbiAgfVxuICByZXR1cm4gcmVxdWVzdFxufVxuXG5SZXF1ZXN0LmJ1aWxkU3Vic2NyaWJlID0gZnVuY3Rpb24gKHNjb3BlLCBvcHRpb25zLCBtZXNzYWdlID0geyBvcDogJ3N1YnNjcmliZScsIHRvOiBzY29wZSB9KSB7XG4gIHJldHVybiBuZXcgUmVxdWVzdChtZXNzYWdlKS5zZXRPcHRpb25zKG9wdGlvbnMpXG59XG5cblJlcXVlc3QuYnVpbGRVbnN1YnNjcmliZSA9IGZ1bmN0aW9uIChzY29wZSwgbWVzc2FnZSA9IHsgb3A6ICd1bnN1YnNjcmliZScsIHRvOiBzY29wZSB9KSB7XG4gIHJldHVybiBuZXcgUmVxdWVzdChtZXNzYWdlKVxufVxuXG4vLyBJbnN0YW5jZSBtZXRob2RzXG5cblJlcXVlc3QucHJvdG90eXBlLmZvcmNlVjJTeW5jID0gZnVuY3Rpb24gKG9wdGlvbnMgPSB7fSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fSAvLyBvcHRpb25zIGlzIHNvbWV0aW1lcyBudWxsLCB3aGljaCB3b3VsZCBjYXVzZSBhbiBleGNlcHRpb24gb24gdGhlIG5leHQgbGluZVxuICBvcHRpb25zLnZlcnNpb24gPSAyXG4gIHRoaXMuc2V0QXR0cignb3B0aW9ucycsIG9wdGlvbnMpXG59XG5cblJlcXVlc3QucHJvdG90eXBlLnNldEF1dGhEYXRhID0gZnVuY3Rpb24gKGNvbmZpZ3VyYXRpb24pIHtcbiAgdGhpcy5zZXRBdHRyKCd1c2VyRGF0YScsIGNvbmZpZ3VyYXRpb24udXNlckRhdGEpXG4gIGlmIChjb25maWd1cmF0aW9uLmF1dGgpIHtcbiAgICB0aGlzLnNldEF0dHIoJ2F1dGgnLCBjb25maWd1cmF0aW9uLmF1dGgpXG4gICAgdGhpcy5zZXRBdHRyKCd1c2VySWQnLCBjb25maWd1cmF0aW9uLnVzZXJJZClcbiAgICB0aGlzLnNldEF0dHIoJ3VzZXJUeXBlJywgY29uZmlndXJhdGlvbi51c2VyVHlwZSlcbiAgICB0aGlzLnNldEF0dHIoJ2FjY291bnROYW1lJywgY29uZmlndXJhdGlvbi5hY2NvdW50TmFtZSlcbiAgfVxufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5nZXRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tZXNzYWdlXG59XG5cblJlcXVlc3QucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBLZWVwIGNoZWNrIGZvciBvcHRpb25zLCBzaW5jZSBpdCBpcyBzb21ldGltZXMgcHVycG9zZWZ1bGx5IG51bGxcbiAgaWYgKG9wdGlvbnMpIHtcbiAgICB0aGlzLnNldEF0dHIoJ29wdGlvbnMnLCBvcHRpb25zKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuUmVxdWVzdC5wcm90b3R5cGUuaXNQcmVzZW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ3ByZXNlbmNlJ1xufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5zZXRBdHRyID0gZnVuY3Rpb24gKGtleU5hbWUsIGtleVZhbHVlKSB7XG4gIHRoaXMubWVzc2FnZVtrZXlOYW1lXSA9IGtleVZhbHVlXG59XG5cblJlcXVlc3QucHJvdG90eXBlLmdldEF0dHIgPSBmdW5jdGlvbiAoa2V5TmFtZSkge1xuICByZXR1cm4gdGhpcy5tZXNzYWdlW2tleU5hbWVdXG59XG5cblJlcXVlc3QucHJvdG90eXBlLnBheWxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLmdldE1lc3NhZ2UoKSlcbn1cblxuUmVxdWVzdC5wcm90b3R5cGUuZ2V0VHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudHlwZVxufVxuXG4vLyBQcml2YXRlIG1ldGhvZHNcblxuUmVxdWVzdC5wcm90b3R5cGUuX2lzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5tZXNzYWdlLm9wIHx8ICF0aGlzLm1lc3NhZ2UudG8pIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGNvbnN0IHR5cGUgPSB0aGlzLl9nZXRUeXBlKClcbiAgaWYgKHR5cGUpIHtcbiAgICBpZiAodGhpcy5faXNWYWxpZFR5cGUodHlwZSkgJiYgdGhpcy5faXNWYWxpZE9wZXJhdGlvbih0eXBlKSkge1xuICAgICAgdGhpcy50eXBlID0gdHlwZVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nZ2VyLmVycm9yKCdtaXNzaW5nIHR5cGUnKVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNWYWxpZFR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICBmb3IgKGNvbnN0IGtleSBpbiBvcFRhYmxlKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcFRhYmxlLCBrZXkpICYmIGtleSA9PT0gdHlwZSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbiAgdGhpcy5lcnJNc2cgPSAnaW52YWxpZCB0eXBlOiAnICsgdHlwZVxuICBsb2dnZXIuZXJyb3IodGhpcy5lcnJNc2cpXG4gIHJldHVybiBmYWxzZVxufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNWYWxpZE9wZXJhdGlvbiA9IGZ1bmN0aW9uICh0eXBlLCBvcHMgPSBvcFRhYmxlW3R5cGVdKSB7XG4gIGNvbnN0IGlzVmFsaWQgPSBvcHMgJiYgb3BzLmluZGV4T2YodGhpcy5tZXNzYWdlLm9wKSA+PSAwXG4gIGlmICghaXNWYWxpZCkge1xuICAgIHRoaXMuZXJyTXNnID0gJ2ludmFsaWQgb3BlcmF0aW9uOiAnICsgdGhpcy5tZXNzYWdlLm9wICsgJyBmb3IgdHlwZTogJyArIHR5cGVcbiAgICBsb2dnZXIuZXJyb3IodGhpcy5lcnJNc2cpXG4gIH1cbiAgcmV0dXJuIGlzVmFsaWRcbn1cblxuUmVxdWVzdC5wcm90b3R5cGUuX2dldFR5cGUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2UudG8uc3Vic3RyaW5nKDAsIHRoaXMubWVzc2FnZS50by5pbmRleE9mKCc6JykpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdFxuIiwiY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnbWluaWxvZycpKCdtZXNzYWdlOnJlc3BvbnNlJylcblxuZnVuY3Rpb24gUmVzcG9uc2UgKG1lc3NhZ2UpIHtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZVxuXG4gIGlmICghdGhpcy5fdmFsaWRhdGUoKSkge1xuICAgIGxvZ2dlci5lcnJvcignaW52YWxpZCByZXNwb25zZS4gbWVzc2FnZTogJyArIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKVxuICAgIHRoaXMubWVzc2FnZSA9IHt9XG4gIH1cbn1cblxuUmVzcG9uc2UucHJvdG90eXBlLmdldE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2Vcbn1cblxuUmVzcG9uc2UucHJvdG90eXBlLl92YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLm1lc3NhZ2Uub3ApIHtcbiAgICB0aGlzLmVyck1zZyA9ICdtaXNzaW5nIG9wJ1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgc3dpdGNoICh0aGlzLm1lc3NhZ2Uub3ApIHtcbiAgICBjYXNlICdhY2snOlxuICAgICAgaWYgKCF0aGlzLm1lc3NhZ2UudmFsdWUpIHtcbiAgICAgICAgdGhpcy5lcnJNc2cgPSAnbWlzc2luZyB2YWx1ZSdcbiAgICAgICAgbG9nZ2VyLmVycm9yKHRoaXMuZXJyTXNnKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKHRoaXMubWVzc2FnZS5vcCAhPT0gJ2VycicgJiYgIXRoaXMubWVzc2FnZS50bykge1xuICAgICAgICB0aGlzLmVyck1zZyA9ICdtaXNzaW5nIHRvJ1xuICAgICAgICBsb2dnZXIuZXJyb3IodGhpcy5lcnJNc2cpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWVcbn1cblxuUmVzcG9uc2UucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAhIXRoaXMubWVzc2FnZS50byAmJiAhIXRoaXMubWVzc2FnZS52YWx1ZSAmJiAhIXRoaXMubWVzc2FnZS50aW1lXG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5pc0ZvciA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gIHJldHVybiB0aGlzLmdldEF0dHIoJ3RvJykgPT09IHJlcXVlc3QuZ2V0QXR0cigndG8nKVxufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuaXNBY2tGb3IgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICByZXR1cm4gdGhpcy5nZXRBdHRyKCd2YWx1ZScpID09PSByZXF1ZXN0LmdldEF0dHIoJ2FjaycpXG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5nZXRBdHRyID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZVthdHRyXVxufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuZm9yY2VWMVJlc3BvbnNlID0gZnVuY3Rpb24gKCkge1xuICAvLyBTeW5jIHYxIGZvciBwcmVzZW5jZSBzY29wZXMgaXMgaW5jb25zaXN0ZW50OiB0aGUgcmVzdWx0IHNob3VsZCBiZSBhICdnZXQnXG4gIC8vIG1lc3NhZ2UsIGJ1dCBpbnN0ZWFkIGlzIGFuICdvbmxpbmUnIG1lc3NhZ2UuICBUYWtlIGEgdjIgcmVzcG9uc2UgYW5kXG4gIC8vIG1hc3NhZ2UgaXQgdG8gdjEgZm9ybWF0IHByaW9yIHRvIHJldHVybmluZyB0byB0aGUgY2FsbGVyLlxuICBjb25zdCBtZXNzYWdlID0gdGhpcy5tZXNzYWdlXG4gIGNvbnN0IHZhbHVlID0ge31cblxuICBmb3IgKGNvbnN0IHVzZXJJZCBpbiBtZXNzYWdlLnZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZXNzYWdlLnZhbHVlLCB1c2VySWQpKSB7XG4gICAgICAvLyBTa2lwIHdoZW4gbm90IGRlZmluZWQ7IGNhdXNlcyBleGNlcHRpb24gaW4gRkYgZm9yICdXb3JrIE9mZmxpbmUnXG4gICAgICBpZiAoIW1lc3NhZ2UudmFsdWVbdXNlcklkXSkgeyBjb250aW51ZSB9XG4gICAgICB2YWx1ZVt1c2VySWRdID0gbWVzc2FnZS52YWx1ZVt1c2VySWRdLnVzZXJUeXBlXG4gICAgfVxuICB9XG4gIG1lc3NhZ2UudmFsdWUgPSB2YWx1ZVxuICBtZXNzYWdlLm9wID0gJ29ubGluZSdcblxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2VcbiIsIi8qXG5cbiAgSmF2YXNjcmlwdCBTdGF0ZSBNYWNoaW5lIExpYnJhcnkgLSBodHRwczovL2dpdGh1Yi5jb20vamFrZXNnb3Jkb24vamF2YXNjcmlwdC1zdGF0ZS1tYWNoaW5lXG5cbiAgQ29weXJpZ2h0IChjKSAyMDEyLCAyMDEzIEpha2UgR29yZG9uIGFuZCBjb250cmlidXRvcnNcbiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlIC0gaHR0cHM6Ly9naXRodWIuY29tL2pha2VzZ29yZG9uL2phdmFzY3JpcHQtc3RhdGUtbWFjaGluZS9ibG9iL21hc3Rlci9MSUNFTlNFXG5cbiovXG5cbnZhciBTdGF0ZU1hY2hpbmUgPSBTdGF0ZU1hY2hpbmUgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICBWRVJTSU9OOiAnMi4yLjAnLFxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIFJlc3VsdDoge1xuICAgICAgU1VDQ0VFREVEOiAgICAxLCAvLyB0aGUgZXZlbnQgdHJhbnNpdGlvbmVkIHN1Y2Nlc3NmdWxseSBmcm9tIG9uZSBzdGF0ZSB0byBhbm90aGVyXG4gICAgICBOT1RSQU5TSVRJT046IDIsIC8vIHRoZSBldmVudCB3YXMgc3VjY2Vzc2Z1bGwgYnV0IG5vIHN0YXRlIHRyYW5zaXRpb24gd2FzIG5lY2Vzc2FyeVxuICAgICAgQ0FOQ0VMTEVEOiAgICAzLCAvLyB0aGUgZXZlbnQgd2FzIGNhbmNlbGxlZCBieSB0aGUgY2FsbGVyIGluIGEgYmVmb3JlRXZlbnQgY2FsbGJhY2tcbiAgICAgIFBFTkRJTkc6ICAgICAgNCAgLy8gdGhlIGV2ZW50IGlzIGFzeW5jaHJvbm91cyBhbmQgdGhlIGNhbGxlciBpcyBpbiBjb250cm9sIG9mIHdoZW4gdGhlIHRyYW5zaXRpb24gb2NjdXJzXG4gICAgfSxcblxuICAgIEVycm9yOiB7XG4gICAgICBJTlZBTElEX1RSQU5TSVRJT046IDEwMCwgLy8gY2FsbGVyIHRyaWVkIHRvIGZpcmUgYW4gZXZlbnQgdGhhdCB3YXMgaW5uYXByb3ByaWF0ZSBpbiB0aGUgY3VycmVudCBzdGF0ZVxuICAgICAgUEVORElOR19UUkFOU0lUSU9OOiAyMDAsIC8vIGNhbGxlciB0cmllZCB0byBmaXJlIGFuIGV2ZW50IHdoaWxlIGFuIGFzeW5jIHRyYW5zaXRpb24gd2FzIHN0aWxsIHBlbmRpbmdcbiAgICAgIElOVkFMSURfQ0FMTEJBQ0s6ICAgMzAwIC8vIGNhbGxlciBwcm92aWRlZCBjYWxsYmFjayBmdW5jdGlvbiB0aHJldyBhbiBleGNlcHRpb25cbiAgICB9LFxuXG4gICAgV0lMRENBUkQ6ICcqJyxcbiAgICBBU1lOQzogJ2FzeW5jJyxcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICBjcmVhdGU6IGZ1bmN0aW9uKGNmZywgdGFyZ2V0KSB7XG5cbiAgICAgIHZhciBpbml0aWFsICAgPSAodHlwZW9mIGNmZy5pbml0aWFsID09ICdzdHJpbmcnKSA/IHsgc3RhdGU6IGNmZy5pbml0aWFsIH0gOiBjZmcuaW5pdGlhbDsgLy8gYWxsb3cgZm9yIGEgc2ltcGxlIHN0cmluZywgb3IgYW4gb2JqZWN0IHdpdGggeyBzdGF0ZTogJ2ZvbycsIGV2ZW50OiAnc2V0dXAnLCBkZWZlcjogdHJ1ZXxmYWxzZSB9XG4gICAgICB2YXIgdGVybWluYWwgID0gY2ZnLnRlcm1pbmFsIHx8IGNmZ1snZmluYWwnXTtcbiAgICAgIHZhciBmc20gICAgICAgPSB0YXJnZXQgfHwgY2ZnLnRhcmdldCAgfHwge307XG4gICAgICB2YXIgZXZlbnRzICAgID0gY2ZnLmV2ZW50cyB8fCBbXTtcbiAgICAgIHZhciBjYWxsYmFja3MgPSBjZmcuY2FsbGJhY2tzIHx8IHt9O1xuICAgICAgdmFyIG1hcCAgICAgICA9IHt9O1xuICAgICAgdmFyIG5hbWU7XG5cbiAgICAgIHZhciBhZGQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBmcm9tID0gKGUuZnJvbSBpbnN0YW5jZW9mIEFycmF5KSA/IGUuZnJvbSA6IChlLmZyb20gPyBbZS5mcm9tXSA6IFtTdGF0ZU1hY2hpbmUuV0lMRENBUkRdKTsgLy8gYWxsb3cgJ3dpbGRjYXJkJyB0cmFuc2l0aW9uIGlmICdmcm9tJyBpcyBub3Qgc3BlY2lmaWVkXG4gICAgICAgIG1hcFtlLm5hbWVdID0gbWFwW2UubmFtZV0gfHwge307XG4gICAgICAgIGZvciAodmFyIG4gPSAwIDsgbiA8IGZyb20ubGVuZ3RoIDsgbisrKVxuICAgICAgICAgIG1hcFtlLm5hbWVdW2Zyb21bbl1dID0gZS50byB8fCBmcm9tW25dOyAvLyBhbGxvdyBuby1vcCB0cmFuc2l0aW9uIGlmICd0bycgaXMgbm90IHNwZWNpZmllZFxuICAgICAgfTtcblxuICAgICAgaWYgKGluaXRpYWwpIHtcbiAgICAgICAgaW5pdGlhbC5ldmVudCA9IGluaXRpYWwuZXZlbnQgfHwgJ3N0YXJ0dXAnO1xuICAgICAgICBhZGQoeyBuYW1lOiBpbml0aWFsLmV2ZW50LCBmcm9tOiAnbm9uZScsIHRvOiBpbml0aWFsLnN0YXRlIH0pO1xuICAgICAgfVxuXG4gICAgICBmb3IodmFyIG4gPSAwIDsgbiA8IGV2ZW50cy5sZW5ndGggOyBuKyspXG4gICAgICAgIGFkZChldmVudHNbbl0pO1xuXG4gICAgICBmb3IobmFtZSBpbiBtYXApIHtcbiAgICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSlcbiAgICAgICAgICBmc21bbmFtZV0gPSBTdGF0ZU1hY2hpbmUuYnVpbGRFdmVudChuYW1lLCBtYXBbbmFtZV0pO1xuICAgICAgfVxuXG4gICAgICBmb3IobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSlcbiAgICAgICAgICBmc21bbmFtZV0gPSBjYWxsYmFja3NbbmFtZV07XG4gICAgICB9XG5cbiAgICAgIGZzbS5jdXJyZW50ID0gJ25vbmUnO1xuICAgICAgZnNtLmlzICAgICAgPSBmdW5jdGlvbihzdGF0ZSkgeyByZXR1cm4gKHN0YXRlIGluc3RhbmNlb2YgQXJyYXkpID8gKHN0YXRlLmluZGV4T2YodGhpcy5jdXJyZW50KSA+PSAwKSA6ICh0aGlzLmN1cnJlbnQgPT09IHN0YXRlKTsgfTtcbiAgICAgIGZzbS5jYW4gICAgID0gZnVuY3Rpb24oZXZlbnQpIHsgcmV0dXJuICF0aGlzLnRyYW5zaXRpb24gJiYgKG1hcFtldmVudF0uaGFzT3duUHJvcGVydHkodGhpcy5jdXJyZW50KSB8fCBtYXBbZXZlbnRdLmhhc093blByb3BlcnR5KFN0YXRlTWFjaGluZS5XSUxEQ0FSRCkpOyB9O1xuICAgICAgZnNtLmNhbm5vdCAgPSBmdW5jdGlvbihldmVudCkgeyByZXR1cm4gIXRoaXMuY2FuKGV2ZW50KTsgfTtcbiAgICAgIGZzbS5lcnJvciAgID0gY2ZnLmVycm9yIHx8IGZ1bmN0aW9uKG5hbWUsIGZyb20sIHRvLCBhcmdzLCBlcnJvciwgbXNnLCBlKSB7IHRocm93IGUgfHwgbXNnOyB9OyAvLyBkZWZhdWx0IGJlaGF2aW9yIHdoZW4gc29tZXRoaW5nIHVuZXhwZWN0ZWQgaGFwcGVucyBpcyB0byB0aHJvdyBhbiBleGNlcHRpb24sIGJ1dCBjYWxsZXIgY2FuIG92ZXJyaWRlIHRoaXMgYmVoYXZpb3IgaWYgZGVzaXJlZCAoc2VlIGdpdGh1YiBpc3N1ZSAjMyBhbmQgIzE3KVxuXG4gICAgICBmc20uaXNGaW5pc2hlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5pcyh0ZXJtaW5hbCk7IH07XG5cbiAgICAgIGlmIChpbml0aWFsICYmICFpbml0aWFsLmRlZmVyKVxuICAgICAgICBmc21baW5pdGlhbC5ldmVudF0oKTtcblxuICAgICAgcmV0dXJuIGZzbTtcblxuICAgIH0sXG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgZG9DYWxsYmFjazogZnVuY3Rpb24oZnNtLCBmdW5jLCBuYW1lLCBmcm9tLCB0bywgYXJncykge1xuICAgICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShmc20sIFtuYW1lLCBmcm9tLCB0b10uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKSB7XG4gICAgICAgICAgcmV0dXJuIGZzbS5lcnJvcihuYW1lLCBmcm9tLCB0bywgYXJncywgU3RhdGVNYWNoaW5lLkVycm9yLklOVkFMSURfQ0FMTEJBQ0ssICdhbiBleGNlcHRpb24gb2NjdXJyZWQgaW4gYSBjYWxsZXItcHJvdmlkZWQgY2FsbGJhY2sgZnVuY3Rpb24nLCBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBiZWZvcmVBbnlFdmVudDogIGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHsgcmV0dXJuIFN0YXRlTWFjaGluZS5kb0NhbGxiYWNrKGZzbSwgZnNtLm9uYmVmb3JlZXZlbnQsICAgICAgICAgICAgICAgICAgICAgICBuYW1lLCBmcm9tLCB0bywgYXJncyk7IH0sXG4gICAgYWZ0ZXJBbnlFdmVudDogICBmdW5jdGlvbihmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSB7IHJldHVybiBTdGF0ZU1hY2hpbmUuZG9DYWxsYmFjayhmc20sIGZzbS5vbmFmdGVyZXZlbnQgfHwgZnNtLm9uZXZlbnQsICAgICAgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpOyB9LFxuICAgIGxlYXZlQW55U3RhdGU6ICAgZnVuY3Rpb24oZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncykgeyByZXR1cm4gU3RhdGVNYWNoaW5lLmRvQ2FsbGJhY2soZnNtLCBmc20ub25sZWF2ZXN0YXRlLCAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsIGZyb20sIHRvLCBhcmdzKTsgfSxcbiAgICBlbnRlckFueVN0YXRlOiAgIGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHsgcmV0dXJuIFN0YXRlTWFjaGluZS5kb0NhbGxiYWNrKGZzbSwgZnNtLm9uZW50ZXJzdGF0ZSB8fCBmc20ub25zdGF0ZSwgICAgICBuYW1lLCBmcm9tLCB0bywgYXJncyk7IH0sXG4gICAgY2hhbmdlU3RhdGU6ICAgICBmdW5jdGlvbihmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSB7IHJldHVybiBTdGF0ZU1hY2hpbmUuZG9DYWxsYmFjayhmc20sIGZzbS5vbmNoYW5nZXN0YXRlLCAgICAgICAgICAgICAgICAgICAgICAgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpOyB9LFxuXG4gICAgYmVmb3JlVGhpc0V2ZW50OiBmdW5jdGlvbihmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSB7IHJldHVybiBTdGF0ZU1hY2hpbmUuZG9DYWxsYmFjayhmc20sIGZzbVsnb25iZWZvcmUnICsgbmFtZV0sICAgICAgICAgICAgICAgICAgICAgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpOyB9LFxuICAgIGFmdGVyVGhpc0V2ZW50OiAgZnVuY3Rpb24oZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncykgeyByZXR1cm4gU3RhdGVNYWNoaW5lLmRvQ2FsbGJhY2soZnNtLCBmc21bJ29uYWZ0ZXInICArIG5hbWVdIHx8IGZzbVsnb24nICsgbmFtZV0sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTsgfSxcbiAgICBsZWF2ZVRoaXNTdGF0ZTogIGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHsgcmV0dXJuIFN0YXRlTWFjaGluZS5kb0NhbGxiYWNrKGZzbSwgZnNtWydvbmxlYXZlJyAgKyBmcm9tXSwgICAgICAgICAgICAgICAgICAgICBuYW1lLCBmcm9tLCB0bywgYXJncyk7IH0sXG4gICAgZW50ZXJUaGlzU3RhdGU6ICBmdW5jdGlvbihmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSB7IHJldHVybiBTdGF0ZU1hY2hpbmUuZG9DYWxsYmFjayhmc20sIGZzbVsnb25lbnRlcicgICsgdG9dICAgfHwgZnNtWydvbicgKyB0b10sICAgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpOyB9LFxuXG4gICAgYmVmb3JlRXZlbnQ6IGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHtcbiAgICAgIGlmICgoZmFsc2UgPT09IFN0YXRlTWFjaGluZS5iZWZvcmVUaGlzRXZlbnQoZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncykpIHx8XG4gICAgICAgICAgKGZhbHNlID09PSBTdGF0ZU1hY2hpbmUuYmVmb3JlQW55RXZlbnQoIGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICBhZnRlckV2ZW50OiBmdW5jdGlvbihmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSB7XG4gICAgICBTdGF0ZU1hY2hpbmUuYWZ0ZXJUaGlzRXZlbnQoZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncyk7XG4gICAgICBTdGF0ZU1hY2hpbmUuYWZ0ZXJBbnlFdmVudCggZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncyk7XG4gICAgfSxcblxuICAgIGxlYXZlU3RhdGU6IGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHtcbiAgICAgIHZhciBzcGVjaWZpYyA9IFN0YXRlTWFjaGluZS5sZWF2ZVRoaXNTdGF0ZShmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKSxcbiAgICAgICAgICBnZW5lcmFsICA9IFN0YXRlTWFjaGluZS5sZWF2ZUFueVN0YXRlKCBmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTtcbiAgICAgIGlmICgoZmFsc2UgPT09IHNwZWNpZmljKSB8fCAoZmFsc2UgPT09IGdlbmVyYWwpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBlbHNlIGlmICgoU3RhdGVNYWNoaW5lLkFTWU5DID09PSBzcGVjaWZpYykgfHwgKFN0YXRlTWFjaGluZS5BU1lOQyA9PT0gZ2VuZXJhbCkpXG4gICAgICAgIHJldHVybiBTdGF0ZU1hY2hpbmUuQVNZTkM7XG4gICAgfSxcblxuICAgIGVudGVyU3RhdGU6IGZ1bmN0aW9uKGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpIHtcbiAgICAgIFN0YXRlTWFjaGluZS5lbnRlclRoaXNTdGF0ZShmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTtcbiAgICAgIFN0YXRlTWFjaGluZS5lbnRlckFueVN0YXRlKCBmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTtcbiAgICB9LFxuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGJ1aWxkRXZlbnQ6IGZ1bmN0aW9uKG5hbWUsIG1hcCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBmcm9tICA9IHRoaXMuY3VycmVudDtcbiAgICAgICAgdmFyIHRvICAgID0gbWFwW2Zyb21dIHx8IG1hcFtTdGF0ZU1hY2hpbmUuV0lMRENBUkRdIHx8IGZyb207XG4gICAgICAgIHZhciBhcmdzICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7IC8vIHR1cm4gYXJndW1lbnRzIGludG8gcHVyZSBhcnJheVxuXG4gICAgICAgIGlmICh0aGlzLnRyYW5zaXRpb24pXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZXJyb3IobmFtZSwgZnJvbSwgdG8sIGFyZ3MsIFN0YXRlTWFjaGluZS5FcnJvci5QRU5ESU5HX1RSQU5TSVRJT04sICdldmVudCAnICsgbmFtZSArICcgaW5hcHByb3ByaWF0ZSBiZWNhdXNlIHByZXZpb3VzIHRyYW5zaXRpb24gZGlkIG5vdCBjb21wbGV0ZScpO1xuXG4gICAgICAgIGlmICh0aGlzLmNhbm5vdChuYW1lKSlcbiAgICAgICAgICByZXR1cm4gdGhpcy5lcnJvcihuYW1lLCBmcm9tLCB0bywgYXJncywgU3RhdGVNYWNoaW5lLkVycm9yLklOVkFMSURfVFJBTlNJVElPTiwgJ2V2ZW50ICcgKyBuYW1lICsgJyBpbmFwcHJvcHJpYXRlIGluIGN1cnJlbnQgc3RhdGUgJyArIHRoaXMuY3VycmVudCk7XG5cbiAgICAgICAgaWYgKGZhbHNlID09PSBTdGF0ZU1hY2hpbmUuYmVmb3JlRXZlbnQodGhpcywgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpKVxuICAgICAgICAgIHJldHVybiBTdGF0ZU1hY2hpbmUuUmVzdWx0LkNBTkNFTExFRDtcblxuICAgICAgICBpZiAoZnJvbSA9PT0gdG8pIHtcbiAgICAgICAgICBTdGF0ZU1hY2hpbmUuYWZ0ZXJFdmVudCh0aGlzLCBuYW1lLCBmcm9tLCB0bywgYXJncyk7XG4gICAgICAgICAgcmV0dXJuIFN0YXRlTWFjaGluZS5SZXN1bHQuTk9UUkFOU0lUSU9OO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHJlcGFyZSBhIHRyYW5zaXRpb24gbWV0aG9kIGZvciB1c2UgRUlUSEVSIGxvd2VyIGRvd24sIG9yIGJ5IGNhbGxlciBpZiB0aGV5IHdhbnQgYW4gYXN5bmMgdHJhbnNpdGlvbiAoaW5kaWNhdGVkIGJ5IGFuIEFTWU5DIHJldHVybiB2YWx1ZSBmcm9tIGxlYXZlU3RhdGUpXG4gICAgICAgIHZhciBmc20gPSB0aGlzO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBmc20udHJhbnNpdGlvbiA9IG51bGw7IC8vIHRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGV2ZXIgYmUgY2FsbGVkIG9uY2VcbiAgICAgICAgICBmc20uY3VycmVudCA9IHRvO1xuICAgICAgICAgIFN0YXRlTWFjaGluZS5lbnRlclN0YXRlKCBmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTtcbiAgICAgICAgICBTdGF0ZU1hY2hpbmUuY2hhbmdlU3RhdGUoZnNtLCBuYW1lLCBmcm9tLCB0bywgYXJncyk7XG4gICAgICAgICAgU3RhdGVNYWNoaW5lLmFmdGVyRXZlbnQoIGZzbSwgbmFtZSwgZnJvbSwgdG8sIGFyZ3MpO1xuICAgICAgICAgIHJldHVybiBTdGF0ZU1hY2hpbmUuUmVzdWx0LlNVQ0NFRURFRDtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uLmNhbmNlbCA9IGZ1bmN0aW9uKCkgeyAvLyBwcm92aWRlIGEgd2F5IGZvciBjYWxsZXIgdG8gY2FuY2VsIGFzeW5jIHRyYW5zaXRpb24gaWYgZGVzaXJlZCAoaXNzdWUgIzIyKVxuICAgICAgICAgIGZzbS50cmFuc2l0aW9uID0gbnVsbDtcbiAgICAgICAgICBTdGF0ZU1hY2hpbmUuYWZ0ZXJFdmVudChmc20sIG5hbWUsIGZyb20sIHRvLCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbGVhdmUgPSBTdGF0ZU1hY2hpbmUubGVhdmVTdGF0ZSh0aGlzLCBuYW1lLCBmcm9tLCB0bywgYXJncyk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gbGVhdmUpIHtcbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb24gPSBudWxsO1xuICAgICAgICAgIHJldHVybiBTdGF0ZU1hY2hpbmUuUmVzdWx0LkNBTkNFTExFRDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChTdGF0ZU1hY2hpbmUuQVNZTkMgPT09IGxlYXZlKSB7XG4gICAgICAgICAgcmV0dXJuIFN0YXRlTWFjaGluZS5SZXN1bHQuUEVORElORztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy50cmFuc2l0aW9uKSAvLyBuZWVkIHRvIGNoZWNrIGluIGNhc2UgdXNlciBtYW51YWxseSBjYWxsZWQgdHJhbnNpdGlvbigpIGJ1dCBmb3Jnb3QgdG8gcmV0dXJuIFN0YXRlTWFjaGluZS5BU1lOQ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvbigpO1xuICAgICAgICB9XG5cbiAgICAgIH07XG4gICAgfVxuXG4gIH07IC8vIFN0YXRlTWFjaGluZVxuIiwibW9kdWxlLmV4cG9ydHMgPSBlaW87IiwibW9kdWxlLmV4cG9ydHMgPSBNaW5pbG9nOyJdLCJzb3VyY2VSb290IjoiIn0=