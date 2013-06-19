var assert = require('assert'),
    log = require('minilog')('state.test'),
    StateMachine = require('../lib/state.js'),
    machine;

exports['given a state machine'] = {
  beforeEach: function() {
    machine = StateMachine.create();
  },

  'calling start twice should not cause two connections': function() {
    var connecting = false;

    machine.on('connect', function() {
      if (connecting) {
        assert.ok(false);
      } else {
        connecting = true;
      }
    });
    machine.configure();
    machine.start();
    machine.start();
    assert.ok(connecting);
  },

  'if the user calls disconnect, emit disconnected and do not reconnect': function() {
    machine.disconnect(true);
    assert.ok(machine.is('disconnected'));
  },

  'the first connection should emit connected, after disconnected it should automatically reconnect and emit reconnected': function() {
    machine.connect();
    machine.disconnect();
    assert.ok(machine.is('connecting'));
  },

  'connections that hang should be detected after 7 seconds': function(done) {
    this.timeout(10000);

    machine.disconnect = function(permanent) {
      assert.equal(permanent, false);
      done();
    };

    machine.startGuard();
  },

  'connections that fail should cause exponential backoff, finally emit unavailable': function(done) {
    var available = true, tries = 10;

    machine.on('unavailable', function() {
      available = false;
      done();
    });

    machine.connect();

    while (available && --tries) {
      machine.disconnect();
      assert.ok(machine.is('connecting'));
    }
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
