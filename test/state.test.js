var assert = require('assert'),
    MiniEventEmitter = require('miniee'),
    log = require('minilog')('state.test'),
    StateMachine = require('../lib/state.js');

var Source = new MiniEventEmitter(),
    MyApp = new MiniEventEmitter(),
    events = [];

Source.close = Source.disconnect = function() {
  process.nextTick(function() { Source.emit('close');});
};

function getSource() {
  Source.removeAllListeners();
  process.nextTick(function() { Source.emit('open');});
  return Source;
}

MyApp._emit = MyApp.emit;
MyApp.emit = function(event) {
  var args = Array.prototype.slice.call(arguments);
  events.push(event);
  MyApp._emit.apply(MyApp, args);
};

var oldSetTimeout = setTimeout;

exports['given a state machine'] = {

  before: function(done) {
    var self = this;
    // create lookup from state number to state string
    this.lookup = [];
    Object.keys(StateMachine.states).forEach(function(name) {
      self.lookup[StateMachine.states[name]] = name;
    });
    StateMachine._setTimeout(function(cb, time) {
      return oldSetTimeout(cb, Math.floor(time / 100));
    });
    done();
  },

  after: function(done) {
    StateMachine._setTimeout(oldSetTimeout);
    done();
  },

  beforeEach: function(done) {
    this.machine = new StateMachine();
    this.machine.configure(MyApp, {});
    this.machine.createSocket = getSource;
    this.machine.handleMessage = function() {};

    // capture the state transitions by hooking .set(state)
    var self = this,
        oldRun = this.machine.run;
    this.transitions = [];
    this.machine.run = function() {
      self.transitions.push(self.lookup[self.machine._state]);
      oldRun.call(self.machine);
    };
    events = [];
    done();
  },

  // ready,
  // connected, reconnected,
  // disconnected, reconnecting,
  // unavailable

  'when connected, ready should be emitted': function(done) {
    var machine = this.machine, transitions = this.transitions;
    MyApp.once('ready', function() {
      log(transitions);
      done();
    });
    machine.connect();
  },

  'calling start twice should not cause two connections': function(done) {
    var machine = this.machine, transitions = this.transitions;
    machine.connect();
    MyApp.once('ready', function() {

      machine.createSocket = function() { assert.ok(false); };
      MyApp.once('ready', function() {
        machine.createSocket = getSource;
        log(transitions);
        done();
      });

      machine.connect();
    });
  },

  'if the user calls disconnect, emit disconnected and do not reconnect': function(done) {
    var machine = this.machine, transitions = this.transitions;
    machine.connect();
    MyApp.once('ready', function() {
      MyApp.once('disconnected', function() {
        log(transitions);
        assert.equal('stopped', transitions[transitions.length-1]);
        done();
      });

      assert.equal(3, transitions.length);
      assert.equal('ready', transitions[transitions.length-1]);

      machine.disconnect();
    });
  },

  'the first connection should emit connected, after disconnected it should automatically reconnect and emit reconnected': function(done) {
    var machine = this.machine, transitions = this.transitions;
    this.timeout(10000);

    machine.connect(MyApp);
    MyApp.once('ready', function() {
      assert.equal('ready', events[events.length -1]);
      assert.equal('connected', events[events.length -2]);

      MyApp.once('disconnected', function() {
        MyApp.once('ready', function() {
          assert.equal('ready', events[events.length -1]);
          assert.equal('reconnected', events[events.length -2]);
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
    this.machine.createSocket = function() {
      // normally we would emit 'open' here in the next tick
      return Source;
    };

    MyApp.once('disconnected', function() {
      log(transitions, events);
      done();
    });
    machine.connect();
  },

  'connections that fail should cause exponential backoff, finally emit unavailable': function(done) {
    var machine = this.machine, transitions = this.transitions;
    this.timeout(100000);

    // require('minilog').pipe(require('minilog').backends.nodeConsole);

    // if the service is not reachable, Engine.io will emit 'close'
    // which is the same as calling handleDisconnect()
    this.machine.createSocket = function() {
      Source.removeAllListeners();
      // normally we would emit 'open' here in the next tick
      setTimeout(function() { Source.emit('close');}, 1);
      return Source;
    };

    // capture calls to machine.retransition(ms), as that mechanism is used for the backoff
    var disconnects = 0,
        assertions = 0;
    MyApp.on('disconnected', function() {
      disconnects++;
      if(require('../lib/backoff').durations[disconnects]) {
        assert.equal(require('../lib/backoff').durations[disconnects], machine._timeout);
        assertions++;
      }
    });
    MyApp.on('unavailable', function() {
      assert.equal(5, assertions);
      done();
    });
    machine.connect();
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
