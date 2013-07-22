var assert = require('assert'),
    log = require('minilog')('state.test'),
    StateMachine = require('../lib/state.js'),
    machine;

exports['given a state machine'] = {
  beforeEach: function() {
    machine = StateMachine.create();
  },

  'calling start twice should not cause two connections': function(done) {
    var connecting = false;

    machine.on('connect', function() {
      assert.ok(!connecting);
      connecting = true;
    });
    machine.start();
    assert.ok(machine.is('connecting'));
    machine.on('established', function() {
      assert.ok(machine.is('authenticating'));
      machine.activate();
      machine.start();
      assert.ok(machine.is('activated'));
      done();
    });
    machine.established();
  },

  'if the user calls disconnect the machine will reconnect after a delay': function(done) {
    this.timeout(4000);
    machine.open();
    machine.connect();
    assert.ok(machine.is('connecting'));
    machine.once('connect', function() {
      machine.close();
      done();
    });
    machine.disconnect();
  },

  'the first connection should begin connecting, after disconnected it should automatically reconnect': function(done) {
    this.timeout(4000);
    machine.open();
    machine.connect();
    assert.ok(machine.is('connecting'));

    var disconnected = false;

    machine.once('disconnected', function() {
      disconnected = true;
    });

    machine.once('connect', function() {
      assert.ok(disconnected);
      done();
    });

    machine.disconnect();
  },

  'connections that hang should be detected after 10 seconds': function(done) {
    this.timeout(14000);

    machine.disconnect = function() {
      done();
    };

    machine.startGuard();
  },

  'connections that fail should cause exponential backoff, finally emit unavailable': function(done) {
    this.timeout(65000);

    var available = true, tries = 10;

    machine.open();

    machine.on('unavailable', function() {
      available = false;
      done();
    });

    machine.on('connecting', function() {
      if (available && --tries) {
        machine.disconnect();
      }
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
