const MicroEE = require('microee')
const log = require('minilog')('test')

function State () {
  this._written = []
}

const current = new State()

MicroEE.mixin(State)

const sockets = []
function Socket () {
  sockets.push(this)
}

MicroEE.mixin(Socket)

Socket.prototype.send = function (nop, data) {
  const message = JSON.parse(data)
  current._written.push(message)
  log(message)
  if (message.op === 'get' || message.op === 'sync') {
    this.emit('message', data)
  }
  // ACKs should be returned immediately
  if (message.ack) {
    this.emit('message', JSON.stringify({ op: 'ack', value: message.ack }))
  }
}

Socket.prototype.close = function () {
  const self = this
  self._state = 'closing'
  setTimeout(function () {
    self._state = 'closed'
    self.emit('close')
  }, 5)
}

function wrap (delay) {
  const s = new Socket()
  s._state = 'opening'
  setTimeout(function () {
    s.emit('open')
    s._state = 'open'
  }, delay)
  return s
}

const MockEngine = function (openDelay) {
  openDelay = openDelay || 5
  return {
    Socket: function () { return wrap(openDelay) },
    current: current,
    sockets: sockets
  }
}

module.exports = MockEngine
