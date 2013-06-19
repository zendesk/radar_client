var assert = require('assert'),
    RadarClient = require('../lib/radar_client.js'),
    MockEngine = require('./lib/engine.js'),
    client;

exports['before connecting'] = {
  before: function(done) {
    RadarClient.setBackend(MockEngine);
    done();
  },
  after: function(done) {
    RadarClient.setBackend({});
    done();
  },

  beforeEach: function(done) {
    client = new RadarClient();
    done();
  },

  afterEach: function(done) {
    MockEngine.current._written = [];
    done();
  },

  'making set() calls should not cause errors when not connected': function() {
    client.presence('tickets/21').set('online');
    client.presence('tickets/21').subscribe();
    client.presence('tickets/21').unsubscribe();
    client.message('user/123').publish('hello world');
    client.presence('tickets/21').get(function() {});
    client.status('user/123').set('foo', 'bar');
    client.on('foo', function() {});
  },

  'calling alloc or dealloc before configure call should not cause errors': function(done) {
    client.dealloc('test');
    client.alloc('test', function() {
      // this should never be called because of the dealloc
      assert.ok(false);
    });
    client.dealloc('test');
    client.dealloc('test2');
    client.alloc('test2', done);
    client.configure({ userId: 123, accountName: 'dev' });
  }

};

exports['given a new presence'] = {
  beforeEach: function(done) {
    client = new RadarClient(MockEngine).configure({ userId: 123, accountName: 'dev' })
      .alloc('test', done);
  },

  afterEach: function(done) {
    MockEngine.current._written = [];
    done();
  },

  'can configure my id': function(done) {
    assert.equal(123, client._configuration.userId);
    done();
  },

  'can set presence online in a scope': function(done) {
    client.presence('tickets/21').set('online');

    setTimeout(function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'set' &&
            message.to == 'presence:/dev/tickets/21' &&
            message.value == 'online');
        })
      );

      done();
    }, 5);
  },

  'can set presence offline in a scope': function(done) {
    client.presence('tickets/21').set('offline');
    setTimeout(function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (
            message.op == 'set' &&
            message.to == 'presence:/dev/tickets/21' &&
            message.value == 'offline' &&
            message.key == '123'
          );
        })
      );

      done();
    }, 5);
  },

  'can subscribe to a presence scope': function(done) {
    client.presence('tickets/21').subscribe();

    setTimeout(function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'subscribe' &&
            message.to == 'presence:/dev/tickets/21'
          );
        })
      );

      done();
    }, 5);
  },

  'can unsubscribe from a presence scope': function(done) {
    client.presence('tickets/21').unsubscribe();

    setTimeout(function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'unsubscribe' &&
            message.to == 'presence:/dev/tickets/21'
          );
        })
      );

      done();
    }, 5);
  },

  'can do a one time get for a scope': function(done) {
    client.presence('tickets/21').get(function(results) {
      done();
    });
  },

  'can set options for a get operation': function(done) {
    client.presence('tickets/21').get({ version: 2}, function(results) {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'get' &&
            message.to == 'presence:/dev/tickets/21' &&
            message.options &&
            message.options.version == 2
          );
        })
      );
      done();
    });
  },

  'can set options for a sync operation': function(done) {
    client.presence('tickets/21').sync({ version: 2 });

    setTimeout(function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'sync' &&
            message.to == 'presence:/dev/tickets/21' &&
            message.options &&
            message.options.version == 2
          );
        })
      );

      done();
    }, 5);
  },

  'can publish messages to a user': function (done) {
    client.message('user/123').publish('hello world', function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'publish' &&
            message.to == 'message:/dev/user/123' &&
            message.value == 'hello world'
          );
        })
      );

      done();
    }, 5);
  },

  'if a authentication token is set, it gets sent on each operation': function(done) {
    client.configure({ userId: 123, accountName: 'dev', auth: 'AUTH'});
    client.message('user/123').publish('hello world', function() {
      assert.ok(
        MockEngine.current._written.some(function(message) {
          return (message.op == 'publish' &&
            message.to == 'message:/dev/user/123' &&
            message.value == 'hello world' &&
            message.auth == 'AUTH'
          );
        })
      );
      done();
    });
  },

  'synchronization batch filters out duplicate messages to the same channel by time': function(done) {
    var received = [];
    client.on('foo', function(msg) {
      received.push(msg);
    });
    client._batch({
      to: 'foo',
      value: [
        JSON.stringify({ value: 'a' }),
        1,
        JSON.stringify({ value: 'b' }),
        2,
        JSON.stringify({ value: 'c' }),
        3
      ],
      time: 1
    });
    assert.equal(3, received.length);
    client._batch({
      to: 'foo',
      value: [
        JSON.stringify({ value: 'b' }),
        2,
        JSON.stringify({ value: 'c' }),
        3,
        JSON.stringify({ value: 'd' }),
        600,
      ],
      time: 2
    });
    assert.equal(4, received.length);

    done();
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
