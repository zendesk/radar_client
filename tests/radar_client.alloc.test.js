var assert = require('assert')
var MockEngine = require('./lib/engine.js')()
var RadarClient = require('../lib/radar_client.js')
var getClientVersion = require('../lib/client_version.js')
var client

RadarClient.setBackend(MockEngine)

exports['given an instance of Radar client'] = {
  beforeEach: function () {
    client = new RadarClient()
  },

  afterEach: function () {
    MockEngine.current._written = []
  },

  'client version is always available': function (done) {
    assert.ok(getClientVersion())
    done()
  },

  'calls to operations do not cause errors before the client is configured, but dont write either': function (done) {
    client.status('test/foo').set('bar')
    assert.strictEqual(MockEngine.current._written.length, 0)
    done()
  },

  'as long as the client is configured, nameSync is the first message sent': function (done) {
    client.configure({ userId: 123, accountName: 'dev' })
    client.status('test/foo').set('bar')

    client.on('ready', function () {
      assert.strictEqual(MockEngine.current._written[0].op, 'nameSync')
      assert.strictEqual(MockEngine.current._written[0].to, 'control:/dev/clientName')
      done()
    })
  },

  'as long as the client is configured, client name is set': function (done) {
    client.configure({ userId: 123, accountName: 'dev' })
    client.status('test/foo').set('bar')

    client.on('ready', function () {
      assert.ok(client.name)
      done()
    })
  },

  'as long as the client is configured, any operation that requires a send will automatically connect': function (done) {
    client.configure({ userId: 123, accountName: 'dev' })
    client.status('test/foo').set('bar')

    client.on('ready', function () {
      assert.strictEqual(MockEngine.current._written.length, 2)
      done()
    })
  },

  'alloc calls do not perform a connect if not connected and not configured': function (done) {
    client.alloc('foo')
    setTimeout(function () {
      // We use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('opened'))
      assert.ok(client._waitingForConfigure)
      done()
    }, 6)
  },

  'alloc calls perform a connect if not connected': function (done) {
    client.configure({ userId: 123, accountName: 'dev' })
    client.alloc('foo')
    setTimeout(function () {
      // We use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('activated'))
      done()
    }, 9)
  },

  'configure calls perform a connect if waiting for configured': function (done) {
    client.alloc('foo')
    setTimeout(function () {
      // We use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('opened'))
      assert.ok(client._waitingForConfigure)
      client.configure({ userId: 123, accountName: 'dev' })
      setTimeout(function () {
        assert.ok(client.manager.is('activated'))
        done()
      }, 6)
    }, 6)
  },

  'multiple alloc calls just trigger the callback': function (done) {
    var readyCount = 0
    var allocDoneCount = 0
    client.on('ready', function () {
      readyCount++
    })
    client.configure({ userId: 123, accountName: 'dev' })
    // Test that the callback param works
    function onAlloc () {
      allocDoneCount++
    }
    client.alloc('foo', onAlloc)
    setTimeout(function () {
      // Ready state == 'activated'
      assert.ok(client.manager.is('activated'))
      assert.strictEqual(readyCount, 1)
      assert.strictEqual(allocDoneCount, 1)
      // If the connect code would trigger, then these would not run the
      // on('ready') action immediately.  If the action is run immediately, we
      // know that the connection code was skipped.
      // Might rewrite this to be more explicit later.
      client.alloc('foo')
      client.alloc('foo', onAlloc)
      client.alloc('foo')
      assert.strictEqual(readyCount, 4)
      assert.strictEqual(allocDoneCount, 2)
      done()
    }, 10)
  },

  'dealloc has no effect until all the allocs have been performed': function (done) {
    client.configure({ userId: 123, accountName: 'dev' })

    client.alloc('foo')
    client.alloc('bar')
    client.alloc('baz')
    client.dealloc('baz')
    setTimeout(function () {
      assert.ok(client.manager.is('activated')) // = Ready state
      client.dealloc('bar')
      setTimeout(function () {
        assert.ok(client.manager.is('activated')) // = Ready state
        client.dealloc('foo')
        setTimeout(function () {
          assert.ok(client.manager.is('closed')) // = Stopped state
          done()
        }, 10)
      }, 10)
    }, 10)
  }

}

// When this module is the script being run, run the tests:
if (module === require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ])
  mocha.stdout.pipe(process.stdout)
  mocha.stderr.pipe(process.stderr)
}
