/* globals setImmediate */
const MicroEE = require('microee')
let eio = require('engine.io-client')
const Scope = require('./scope.js')
const StateMachine = require('./state.js')
const immediate = typeof setImmediate !== 'undefined' ? setImmediate : function (fn) { setTimeout(fn, 1) }
const getClientVersion = require('./client_version.js')
const Request = require('radar_message').Request
const Response = require('radar_message').Response

function Client (backend) {
  this.logger = require('minilog')('radar_client')
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
  const self = this
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

  let stillAllocated = false
  let key

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
  const configuration = hash || this._configuration || { accountName: '', userId: 0, userType: 0 }
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
  const request = Request.buildNameSync(scope, options)
  return this._write(request, callback)
}

Client.prototype.push = function (scope, resource, action, value, callback) {
  const request = Request.buildPush(scope, resource, action, value)
  return this._write(request, callback)
}

Client.prototype.set = function (scope, value, clientData, callback) {
  callback = _chooseFunction(clientData, callback)
  clientData = _nullIfFunction(clientData)

  const request = Request.buildSet(scope, value,
    this._configuration.userId, this._configuration.userType,
    clientData)

  return this._write(request, callback)
}

Client.prototype.publish = function (scope, value, callback) {
  const request = Request.buildPublish(scope, value)
  return this._write(request, callback)
}

Client.prototype.subscribe = function (scope, options, callback) {
  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  const request = Request.buildSubscribe(scope, options)

  return this._write(request, callback)
}

Client.prototype.unsubscribe = function (scope, callback) {
  const request = Request.buildUnsubscribe(scope)
  return this._write(request, callback)
}

// sync returns the actual value of the operation
Client.prototype.sync = function (scope, options, callback) {
  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  const request = Request.buildSync(scope, options)

  const v1Presence = !options && request.isPresence()
  const onResponse = function (message) {
    const response = new Response(message)
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
  callback = _chooseFunction(options, callback)
  options = _nullIfFunction(options)

  const request = Request.buildGet(scope, options)

  const onResponse = function (message) {
    const response = new Response(message)
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

const _chooseFunction = function (options, callback) {
  return typeof (options) === 'function' ? options : callback
}

const _nullIfFunction = function (options) {
  if (typeof (options) === 'function') {
    return null
  }
  return options
}

Client.prototype._addListeners = function () {
  // Add authentication data to a request message; _write() emits authenticateMessage
  this.on('authenticateMessage', function (message) {
    const request = new Request(message)
    request.setAuthData(this._configuration)

    this.emit('messageAuthenticated', request.getMessage())
  })

  // Once the request is authenticated, send it to the server
  this.on('messageAuthenticated', function (message) {
    const request = new Request(message)
    this._sendMessage(request)
  })
}

Client.prototype._write = function (request, callback) {
  const self = this

  if (callback) {
    request.setAttr('ack', this._ackCounter++)

    // Wait ack
    this.when('ack', function (message) {
      const response = new Response(message)
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
  const to = response.getAttr('to')
  const value = response.getAttr('value')
  let time = response.getAttr('time')

  if (!response.isValid()) {
    this.logger().info('response is invalid:', response.getMessage())
    return false
  }

  let index = 0
  let data
  const length = value.length
  let newest = time
  const current = this._channelSyncTimes[to] || 0

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
  const self = this
  const manager = this.manager = StateMachine.create()

  manager.on('enterState', function (state) {
    self.emit(state)
  })

  manager.on('event', function (event) {
    self.emit(event)
  })

  manager.on('connect', function (data) {
    const socket = self._socket = new self.backend.Socket(self._configuration)

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

    const socket = self._socket
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
  const op = request.getAttr('op')
  const to = request.getAttr('to')
  const value = request.getAttr('value')

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
  let item
  let to
  const counts = { subscriptions: 0, presences: 0, messages: 0 }
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
  const memorized = this._memorize(request)
  const ack = request.getAttr('ack')

  this.emit('message:out', request.getMessage())

  if (this._socket && this.manager.is('activated')) {
    this._socket.send('message', request.payload())
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
  const response = new Response(JSON.parse(msg))
  const op = response.getAttr('op')
  const to = response.getAttr('to')

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
  const self = this
  const args = Array.prototype.slice.call(arguments)
  immediate(function () { self.emit.apply(self, args) })
}

Client.prototype._identitySet = function () {
  if (this._identitySetRequired) {
    this._identitySetRequired = false

    if (!this.name) {
      this.name = this._uuidV4Generate()
    }

    // Send msg that associates this.id with current name
    const association = { id: this._socket.id, name: this.name }
    const clientVersion = getClientVersion()
    const options = { association: association, clientVersion: clientVersion }
    const self = this

    this.control('clientName').nameSync(options, function (message) {
      self.logger('nameSync message: ' + JSON.stringify(message))
    })
  }
}

// Variant (by Jeff Ward) of code behind node-uuid, but avoids need for module
const lut = []
for (let i = 0; i < 256; i++) { lut[i] = (i < 16 ? '0' : '') + (i).toString(16) }
Client.prototype._uuidV4Generate = function () {
  const d0 = Math.random() * 0xffffffff | 0
  const d1 = Math.random() * 0xffffffff | 0
  const d2 = Math.random() * 0xffffffff | 0
  const d3 = Math.random() * 0xffffffff | 0
  return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
  lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
  lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
  lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff]
}

Client.setBackend = function (lib) { eio = lib }

module.exports = Client
