var MicroEE = require('microee')
var log = require('minilog')('test')

function State () {
  this._written = []
}

var current = new State()

MicroEE.mixin(State)

var sockets = []
var currentSocketId = 1
function Socket () {
  this.id = currentSocketId++
  sockets.push(this)
}

MicroEE.mixin(Socket)

Socket.prototype.sendPacket = function (nop, data) {
  var message = JSON.parse(data)
  current._written.push(message)
  log(message)
  if (message.op === 'get' || message.op === 'sync') {
    this.emit('message', data)
  }
  // ACKs should be returned immediately
  if (message.ack) {
    this.emit('message', JSON.stringify({'op': 'ack', 'value': message.ack}))
  }
}

Socket.prototype.close = function () {
  var self = this
  self._state = 'closing'
  setTimeout(function () {
    self._state = 'closed'
    self.emit('close')
  }, 5)
}

function wrap (delay) {
  var s = new Socket()
  s._state = 'opening'
  setTimeout(function () {
    s.emit('open')
    s._state = 'open'
  }, delay)
  return s
}

var MockEngine = function (openDelay) {
  openDelay = openDelay || 5
  return {
    Socket: function () { return wrap(openDelay) },
    current: current,
    sockets: sockets
  }
}

module.exports = MockEngine
