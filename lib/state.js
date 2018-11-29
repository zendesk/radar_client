var log = require('minilog')('radar_state')
var MicroEE = require('microee')
var Backoff = require('./backoff')
var Machine = require('sfsm')

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
      { name: 'connect', from: [ 'opened', 'disconnected' ], to: 'connecting' },
      { name: 'established', from: 'connecting', to: 'connected' },
      { name: 'authenticate', from: 'connected', to: 'authenticating' },
      { name: 'activate', from: [ 'authenticating', 'activated' ], to: 'activated' },
      { name: 'disconnect', from: Machine.WILDCARD, to: 'disconnected' },
      { name: 'close', from: Machine.WILDCARD, to: 'closed' },
      { name: 'open', from: [ 'none', 'closed' ], to: 'opened' }
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
    if (MicroEE.prototype.hasOwnProperty(property)) {
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
        // Don't connect if we are waiting to reconnect
        if (!machine._timer) {
          this.connect()
        }
      } else {
        this.once('enterState', function () {
          setImmediate(function () { machine.connectWhenAble() })
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
