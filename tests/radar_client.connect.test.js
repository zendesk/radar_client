const assert = require('assert')
const RadarClient = require('../lib/radar_client.js')
// With a delay
const MockEngine = require('./lib/engine.js')(150)
const Backoff = require('../lib/backoff.js')
const Minilog = require('minilog')
let client

if (process.env.verbose === '1') {
  Minilog.pipe(Minilog.backends.nodeConsole.formatWithStack).pipe(Minilog.backends.nodeConsole)
}

exports['before connecting'] = {
  before: function (done) {
    // make sure the first backoff will leave enough time
    Backoff.maxSplay = 100
    Backoff.durations = [200, 300, 400]
    RadarClient.setBackend(MockEngine)
    done()
  },
  after: function (done) {
    RadarClient.setBackend({})
    done()
  },

  beforeEach: function (done) {
    client = new RadarClient()
    client.configure({ accountName: 'test', userId: 123, userType: 2 })
    client.alloc('channel', done)
  },

  afterEach: function (done) {
    MockEngine.current._written = []
    done()
  },

  'socket opening late should not cause two open sockets': function (done) {
    // set wait time to 10, while it takes 150ms for a socket to open
    client.manager._connectTimeout = 10
    client.on('backoff', function (time, failures) {
      // second backoff: after first failure, we expand open timeout
      // to be > 150
      // This is the same as shrinking the socket open delay
      if (failures === 2) {
        client.manager._connectTimeout = 300
      }
    })
    client._socket.close()
    client.on('ready', function () {
      // Wait for 150 so any pending sockets can open
      setTimeout(function () {
        let openSockets = 0
        for (let i = 0; i < MockEngine.sockets.length; i++) {
          if (MockEngine.sockets[i]._state === 'open' || MockEngine.sockets[i]._state === 'opening') {
            openSockets++
          }
        }

        assert.strictEqual(openSockets, 1)
        done()
      }, 150)
    })
  }
}
