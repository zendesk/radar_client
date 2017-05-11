var MicroEE = require('microee')
var log = require('minilog')('test')

function Socket () {
  this._written = []
}

MicroEE.mixin(Socket)

Socket.prototype.sendPacket = function (nop, data) {
  var message = JSON.parse(data)
  current._written.push(message)
  log(message)
  if (message.op === 'get' || message.op === 'sync') {
    current.emit('message', data)
  }
  // ACKs should be returned immediately
  if (message.ack) {
    current.emit('message', JSON.stringify({'op': 'ack', 'value': message.ack}))
  }
}

Socket.prototype.close = function () {
  setTimeout(function () {
    current.emit('close')
  }, 5)
}

var current = new Socket()

function wrap (delay) {
  current.removeAllListeners()
  current._opened = false
  setTimeout(function () {
    current.emit('open')
    current._opened = true
  }, delay)
  return current
}

var MockEngine = function (openDelay) {
  openDelay = openDelay || 5
  return {
    Socket: function () { return wrap(openDelay) },
    current: current
  }
}

module.exports = MockEngine
