var assert = require('assert'),
    MicroEE = require('microee'),
    log = require('minilog')('state.test'),
    StateMachine = require('../lib/state.js'),
    Client = require('../lib/radar_client.js'),
    socket = require('./lib/engine.js').current;

var Source = new MicroEE(),
    client = new Client(),
    events = [],
    once = socket.once;

client.createSocket = function() {
  return socket;
};


Source.close = Source.disconnect = function() {
  process.nextTick(function() { Source.emit('close');});
};

function getSource() {
  Source.removeAllListeners();
  process.nextTick(function() { Source.emit('open');});
  return Source;
}

client._emit = client.emit;
client.emit = function(event) {
  var args = Array.prototype.slice.call(arguments);
  events.push(event);
  client._emit.apply(client, args);
};

var oldSetTimeout = setTimeout;

exports['given a state machine'] = {

  before: function() {
    socket.once = function(event, callback) {
      if (event == 'open') {
        callback.call(this);
      } else {
        once.apply(this, arguments);
      }
    };
  },

  after: function() {
    socket.once = once;
  },

  beforeEach: function() {
    this.machine = StateMachine.create(client);
    var transitions = this.transitions = [];

    this.machine.onchangestate = function(event, from, to) {
      transitions.push(to);
    };
  },

  // ready,
  // connected, reconnected,
  // disconnected, reconnecting,
  // unavailable

  'when connected, ready should be emitted': function(done) {
    var machine = this.machine;
    client.once('ready', function() {
      done();
    });
    machine.configure({});
  },

  'calling configure twice should not cause two connections': function(done) {
    var machine = this.machine, transitions = this.transitions;
    client.once('ready', function() {
      client.once('ready', function() {
        log(transitions);
        done();
      });

      machine.configure({});
    });
    machine.configure({});
  },

  'if the user calls disconnect, emit disconnected and do not reconnect': function(done) {
    var machine = this.machine, transitions = this.transitions;
    client.once('ready', function() {
      client.once('disconnected', function() {
        log(transitions);
        assert.equal('disconnected', transitions[transitions.length-1]);
        done();
      });

      assert.equal(3, transitions.length);
      assert.equal('authenticating', transitions[transitions.length-1]);

      machine.disconnect(true);
    });
    machine.configure({});
  },

  'the first connection should emit connected, after disconnected it should automatically reconnect and emit reconnected': function(done) {
    var machine = this.machine, transitions = this.transitions;
    this.timeout(10000);

    machine.configure({});

    client.once('ready', function() {
      assert.equal('ready', events[events.length -1]);
      assert.equal('authenticated', events[events.length -2]);

      client.once('disconnected', function() {
        client.once('ready', function() {
          assert.equal('ready', events[events.length -1]);
          assert.equal('authenticated', events[events.length -2]);
          done();
        });
      });
      // simulate loss of connection by emitting "close"
      Source.disconnect();
    });
  },

  'connections that hang should be detected after 7 seconds': function(done) {
    var machine = this.machine, transitions = this.transitions;
    this.timeout(10000);

    // creating a socket will do nothing, e.g. the connection will hang
    client.createSocket = function() {
      // normally we would emit 'open' here in the next tick
      return Source;
    };

    client.once('disconnected', function() {
      log(transitions, events);
      done();
    });
    machine.configure({});
  },

  'connections that fail should cause exponential backoff, finally emit unavailable': function(done) {
    var machine = this.machine, Backoff = require('../lib/backoff');
    this.timeout(100000);

    // if the service is not reachable, Engine.io will emit 'close'
    // which is the same as calling disconnect()
    client.createSocket = function() {
      Source.removeAllListeners();
      // normally we would emit 'open' here in the next tick
      setTimeout(function() { Source.emit('close');}, 1);
      return Source;
    };

    // capture calls to machine.retransition(ms), as that mechanism is used for the backoff
    var disconnects = 0;

    client.on('disconnected', function() {
      disconnects++;

      if(Backoff.durations[disconnects]) {
        assert.equal(Backoff.durations[disconnects] + 6000, machine.guardDelay());
      }

      if (disconnects == Backoff.durations.length) {
        done();
      }
    });
    machine.configure({});
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
