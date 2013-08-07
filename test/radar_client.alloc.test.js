var assert = require('assert'),
    MockEngine = require('./lib/engine.js'),
    RadarClient = require('../lib/radar_client.js'),
    client;

RadarClient.setBackend(MockEngine);

exports['given an instance of Radar client'] = {
  beforeEach: function() {
    client = new RadarClient();
  },

  afterEach: function() {
    MockEngine.current._written = [];
  },

  'calls to operations do not cause errors before the client is configured, but dont write either': function(done) {
    client.status('test/foo').set('bar');
    assert.equal(MockEngine.current._written.length, 0);
    done();
  },

  'as long as the client is configured, any operation that requires a send will automatically connect': function(done) {
    client.configure({ userId: 123, accountName: 'dev' });
    client.status('test/foo').set('bar');

    client.on('ready', function() {
      assert.equal(MockEngine.current._written.length, 1);
      done();
    });
  },

  'alloc calls do not perform a connect if not connected and not configured': function(done) {
    client.alloc('foo');
    setTimeout(function() {
      // we use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('opened'));
      assert.ok(client._waitingForConfigure);
      done();
    }, 6);
  },

  'alloc calls perform a connect if not connected': function(done) {
    client.configure({ userId: 123, accountName: 'dev' });
    client.alloc('foo');
    setTimeout(function() {
      // we use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('activated'));
      done();
    }, 9);
  },

  'configure calls perform a connect if waiting for configured': function(done) {
    client.alloc('foo');
    setTimeout(function() {
      // we use a setTimeout, because connecting with the fake backend
      // is also async, it just takes 5 ms rather than a real connect duration
      assert.ok(client.manager.is('opened'));
      assert.ok(client._waitingForConfigure);
      client.configure({ userId: 123, accountName: 'dev' });
      setTimeout(function() {
        assert.ok(client.manager.is('activated'));
        done();
      }, 6);
    }, 6);
  },

  'multiple alloc calls just trigger the callback': function(done) {
    var readyCount = 0,
        allocDoneCount = 0;
    client.on('ready', function() {
      readyCount++;
    });
    client.configure({ userId: 123, accountName: 'dev' });
    // also test that the callback param works
    function onAlloc() {
      allocDoneCount++;
    }
    client.alloc('foo', onAlloc);
    setTimeout(function() {
      assert.ok(client.manager.is('activated')); // = Ready state
      assert.equal(readyCount, 1);
      assert.equal(allocDoneCount, 1);
      // if the connect code would trigger, then these would
      // not run the on('ready') action immediately.
      // If the action is run immediately, we know that the
      // connection code was skipped.
      // Might rewrite this to be more explicit later.
      client.alloc('foo');
      client.alloc('foo', onAlloc);
      client.alloc('foo');
      assert.equal(readyCount, 4);
      assert.equal(allocDoneCount, 2);
      done();
    }, 10);
  },

  'dealloc has no effect until all the allocs have been performed': function(done) {
    client.configure({ userId: 123, accountName: 'dev' });

    client.alloc('foo');
    client.alloc('bar');
    client.alloc('baz');
    client.dealloc('baz');
    setTimeout(function() {
      assert.ok(client.manager.is('activated')); // = Ready state
      client.dealloc('bar');
      setTimeout(function() {
        assert.ok(client.manager.is('activated')); // = Ready state
        client.dealloc('foo');
        setTimeout(function() {
          assert.ok(client.manager.is('closed')); // = Stopped state
          done();
        }, 10);
      }, 10);
    }, 10);
  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
