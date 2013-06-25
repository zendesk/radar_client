var log = require('minilog')('radar_state'),
    MicroEE = require('microee'),
    Backoff = require('./backoff'),
    Machine = require('sfsm');

function create() {
  var backoff = new Backoff(),
      machine = Machine.create({

    error: function(name, from ,to, args, type, message, err) {
      log.warn('state-machine-error', arguments);
    },

    events: [
      { name: 'connect',       from: [ 'opened', 'disconnected' ], to: 'connecting' },
      { name: 'established',   from: 'connecting', to: 'connected' },
      { name: 'authenticate',  from: 'connected', to: 'authenticating' },
      { name: 'activate',      from: [ 'authenticating', 'activated' ], to: 'activated' },
      { name: 'disconnect',    from: Machine.WILDCARD, to: 'disconnected' },
      { name: 'close',         from: Machine.WILDCARD, to: 'closed' },
      { name: 'open',          from: [ 'none', 'closed' ], to: 'opened' }
    ],

    callbacks: {
      onevent: function(event, from, to) {
        log.debug('before-' + event + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        this.emit('event', event);
        this.emit(event, arguments);
      },

      onstate: function(state, from, to) {
        log.debug('state-' + state + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        this.emit('enterState', state);
        this.emit(state, arguments);
      },

      onconnect: function() {
        this.startGuard();
      },

      onestablished: function() {
        this.cancelGuard();
        backoff.success();
        this.authenticate();
      },

      ondisconnect: function(event, from, to, permanent) {
        if (!permanent) {
          backoff.increment();
          this.connect();
        }

        if (backoff.isUnavailable()) {
          this.emit('unavailable');
        }
      },

      onclose: function(event, from, to, socketClosed) {
        this.emit('close');
      }
    }
  });

  for (var property in MicroEE.prototype) {
    if (MicroEE.prototype.hasOwnProperty(property)) {
      machine[property] = MicroEE.prototype[property];
    }
  }

  machine.open();

  machine.start = function() {
    if (this.is('closed')) {
      this.open();
    }

    if (this.is('activated')) {
      this.activate();
    } else {
      this.connectWhenAble();
    }
  };

  machine.startGuard = function() {
    machine._guard = setTimeout(function() {
      machine.disconnect(false);
    }, machine.guardDelay());
  };

  machine.cancelGuard = function() {
    if (machine._guard) {
      clearTimeout(machine._guard);
      delete machine._guard;
    }
  };

  machine.guardDelay = function() {
    return backoff.get() + 6000;
  };

  machine.connectWhenAble = function() {
    if (!this.is('connected')) {
      if (this.can('connect')) {
        this.connect();
      } else {
        this.once('enterState', function() {
          machine.connectWhenAble();
        });
      }
    }
  };

  return machine;
}

module.exports = { create: create };

