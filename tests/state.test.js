var assert = require('assert')
var StateMachine = require('../lib/state.js')
var machine
var Backoff = require('../lib/backoff.js')
var sinon = require('sinon')
var clock

function maxBackoffStep (num) {
  if (num < Backoff.durations.length) {
    return Backoff.durations[num] + Backoff.maxSplay
  } else {
    return Backoff.fallback + Backoff.maxSplay
  }
}

exports['given a state machine'] = {
  beforeEach: function () {
    // create puts it in opened state.
    machine = StateMachine.create()
    machine._backoff.success()
    clock = sinon.useFakeTimers()
  },

  afterEach: function () {
    clock.restore()
  },

  'calling start twice should not cause two connections': function (done) {
    var connecting = false

    machine.on('connect', function () {
      assert.ok(!connecting)
      connecting = true
    })
    machine.start()
    assert.ok(machine.is('connecting'))
    machine.on('established', function () {
      assert.ok(machine.is('authenticating'))
      machine.activate()
      machine.start()
      assert.ok(machine.is('activated'))
      done()
    })
    machine.established()
  },

  'if the user calls disconnect the machine will reconnect after a delay': function (done) {
    machine.connect()
    assert.ok(machine.is('connecting'))
    machine.once('connect', function () {
      machine.close()
      done()
    })
    machine.disconnect()
    clock.tick(maxBackoffStep(0))
  },

  'the first connection should begin connecting, after disconnected it should automatically reconnect': function (done) {
    machine.connect()
    assert.ok(machine.is('connecting'))

    var disconnected = false

    machine.once('disconnected', function () {
      disconnected = true
    })

    machine.once('connect', function () {
      assert.ok(disconnected)
      done()
    })

    machine.disconnect()
    clock.tick(maxBackoffStep(0))
  },

  'connections that hang should be detected after connect timeout': function (done) {
    machine.disconnect = function () {
      done()
    }

    machine.connect()
    clock.tick(machine._connectTimeout + 1)
  },

  'should not get caught by timeout if connect takes too long': function (done) {
    var once = true
    var disconnects = 0

    machine.on('disconnect', function () {
      disconnects++
    })

    setTimeout(function () {
      // Only 1 disconnect due to manager.disconnect()
      assert.strictEqual(disconnects, 1)
      done()
    }, maxBackoffStep(0) + machine._connectTimeout)

    machine.on('connect', function () {
      if (once) {
        machine.disconnect()
        once = false
      } else {
        machine.established()
      }
    })
    machine.connect()

    clock.tick(1 + maxBackoffStep(0) + machine._connectTimeout)
  },

  'connections that fail should cause exponential backoff, emit backoff times, finally emit unavailable': function (done) {
    var available = true
    var tries = Backoff.durations.length + 1
    var backoffs = []

    machine.on('backoff', function (time, failures) {
      backoffs.push(failures)
      var step = failures - 1

      assert(failures > 0)
      assert(time > 0)
      assert(time > (maxBackoffStep(step) - Backoff.maxSplay))
      assert(time < (maxBackoffStep(step) + Backoff.maxSplay))
    })

    machine.once('unavailable', function () {
      available = false

      assert(backoffs.length > 1)
      assert(backoffs.length === machine._backoff.failures)
      assert(backoffs.length === Backoff.durations.length)
      done()
    })

    machine.on('connecting', function () {
      if (available && --tries) {
        machine.disconnect()
      }
    })

    machine.connect()

    // Wait for all the backoffs + splay, then wait for fallback + splay as well
    var totalTimeToWait = 0
    for (var i = 0; i < Backoff.durations.length; i++) {
      totalTimeToWait += maxBackoffStep(i)
    }
    totalTimeToWait += Backoff.fallback + Backoff.maxSplay

    clock.tick(1 + totalTimeToWait)
  },

  'closing will cancel the guard timer': function () {
    assert(!machine._guard)
    machine.connect()
    assert(machine._guard)
    machine.close()
    assert(!machine._guard)
  },

  'should be able to attach a custom errorHandler': function () {
    var handler = function () {}
    machine.attachErrorHandler(handler)
    assert.strictEqual(machine.errorHandler, handler)
  },

  'should be able to override the custom errorHandler': function () {
    var handler1 = function () {}
    var handler2 = function () {}

    machine.attachErrorHandler(handler1)
    machine.attachErrorHandler(handler2)
    assert.strictEqual(machine.errorHandler, handler2)
  },

  'should only allow attaching a function as a custom state machine error handler': function () {
    assert(!machine.errorHandler)

    machine.attachErrorHandler(23)
    assert(!machine.errorHandler)

    machine.attachErrorHandler({})
    assert(!machine.errorHandler)

    machine.attachErrorHandler('error')
    assert(!machine.errorHandler)

    machine.attachErrorHandler(function () {})
    assert(machine.errorHandler)
  }
}

// When this module is the script being run, run the tests:
if (module === require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ])
  mocha.stdout.pipe(process.stdout)
  mocha.stderr.pipe(process.stderr)
}
