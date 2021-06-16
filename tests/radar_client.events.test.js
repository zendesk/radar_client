const assert = require('assert')
const RadarClient = require('../lib/radar_client.js')

exports['given a new presence'] = {
  beforeEach: function (done) {
    this.client = new RadarClient()
    done()
  },

  'can set a event handler and receive messages': function (done) {
    const client = this.client
    client.once('presence:tickets:21', function (changes) {
      assert.deepStrictEqual([1], changes.online)
      assert.deepStrictEqual([], changes.offline)
    })

    // Send an online message
    client.emit('presence:tickets:21', { online: [1], offline: [] })

    client.once('presence:tickets:21', function (changes) {
      assert.deepStrictEqual([], changes.online)
      assert.deepStrictEqual([1], changes.offline)
      done()
    })

    client.emit('presence:tickets:21', { online: [], offline: [1] })
  },

  'can remove a single callback': function (done) {
    const client = this.client
    client.once('presence:tickets:21', function () {
      assert.ok(false)
    })
    client.removeAllListeners('presence:tickets:21')
    client.emit('presence:tickets:21', { online: [1], offline: [2] })
    setTimeout(function () {
      done()
    }, 10)
  },

  'can remove all listeners from an event by string': function (done) {
    const client = this.client
    client.once('presence:tickets:21', function () {
      assert.ok(false)
    })
    client.once('presence:tickets:21', function () {
      assert.ok(false)
    })
    client.removeAllListeners('presence:tickets:21')
    client.emit('presence:tickets:21', { online: [1], offline: [2] })
    setTimeout(function () {
      done()
    }, 10)
  },

  'forwards backoff events from manager': function (done) {
    this.client.once('backoff', function (time, step) {
      done()
    })
    this.client.manager.emit('backoff', 10, 1)
  }
}

// When this module is the script being run, run the tests:
if (module === require.main) {
  const mocha = require('child_process').spawn('mocha', ['--colors', '--ui', 'exports', '--reporter', 'spec', __filename])
  mocha.stdout.pipe(process.stdout)
  mocha.stderr.pipe(process.stderr)
}
