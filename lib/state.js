var log = require('minilog')('radar_state'),
    Backoff = require('./backoff'),
    Machine = require('sfsm'),
    ONE_HOUR = 60 * 60 * 1000;

function create(client) {
  var connections = 0,
      backoff = new Backoff(),
      machine = Machine.create({
    initial: 'opened',

    error: function() {
      log.error('state-machine-error', arguments);
    },

    events: [
      { name: 'configure',     from: [ 'opened', 'connected', 'ready' ], to: 'configured' },
      { name: 'connect',       from: [ 'opened', 'configured', 'disconnected' ], to: 'connecting' },
      { name: 'established',   from: 'connecting', to: 'connected' },
      { name: 'authenticate',  from: 'connected', to: 'authenticating' },
      { name: 'ready',         from: [ 'authenticating', 'ready' ], to: 'ready' },
      { name: 'disconnect',    from: [ 'connecting', 'connected', 'authenticating', 'ready', 'disconnected' ], to: 'disconnected' },
      { name: 'close',         from: [ 'opened', 'configured', 'disconnected', 'connecting', 'connected', 'authenticating', 'ready', 'closed' ], to: 'closed' },
      { name: 'open',          from: 'closed', to: 'opened' }
    ],

    callbacks: {
      onbeforeevent: function(event, from, to) {
        log.info('before-' + event + ', from: ' + from + ', to: ' + to, Array.prototype.slice.call(arguments));

        var listeners = machine.listeners[event], i, l;
        if (listeners) {
          for (i = 0, l = listeners.length; i < l; ++i) {
            listeners[i].call(machine);
          }
        }
      },

      onconfigure: function(event, from, to, configuration) {
        client.removeAllListeners('messageAuthenticated');
        client.on('messageAuthenticated', function(message) {
          machine.sendAuthenticatedMessage(message);
        });

        client.removeAllListeners('authenticated');
        client.on('authenticated', function() {
          machine.ready();
        });

        machine.configuration = configuration;

        if (!machine.is('connected') || !machine.is('ready') || !machine.is('connecting')) {
          machine.connect();
        }
      },

      onconnecting: function() {
        machine.cancelGuard();

        var socket = machine.socket = client.createSocket();

        socket.once('open', function () {
          machine.established();
        });

        socket.on('message', function(message) {
          client.messageReceived(message);
        });

        socket.once('close', function() {
          if (!machine.is('closed')) {
            machine.disconnect(false);
          }
        });

        machine.startGuard();
      },

      onestablished: function() {
        machine.cancelGuard();

        machine.authenticate();
        backoff.success();
        client.connected();
      },

      onauthenticate: function() {
        client.authenticate();
      },

      onready: function(event, from, to) {
        client.ready();

        if (machine.list && machine.list.length) {
          var item, i = 0, length = machine.list.length, oneHourAgo = new Date() - ONE_HOUR;
          for (; i < length; ++i) {
            item = machine.list[i];
            // dont't send messages that are over an hour old
            if (item && item._date > oneHourAgo) {
              machine.send(item);
            }
          }
          machine.list = machine.list.slice(length);
        }
      },

      ondisconnect: function(event, from, to, permanent) {
        if (!permanent) {
          backoff.increment();
          machine.connect();

          if (backoff.unavailable()) {
            client.unavailable();
          }
        }

        client.disconnected(permanent);
      },

      onafterclose: function(event, from, to, socketClosed) {
        if (!socketClosed && machine.socket) {
          machine.socket.close();
          client.disconnected(true);
        }
      }
    }
  });

  machine.start = function() {
    if (this.is('closed')) {
      this.open();
    }

    if (this.is('ready')) {
      client.ready();
    }
  };

  machine.queueLimit = 100;

  machine.queue = function(message) {
    message._date = new Date();
    this.list = this.list || [];

    // limit the number of messages that can be queue
    if (this.list.length > this.queueLimit) {
      this.list = this.list.slice(this.list.length - this.queueLimit);
    }

    return this.list.push(message);
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

  machine.send = function(message) {
    if (this.is('ready')) {
      return client.authenticateMessage(message);
    // only queue after the machine has been configured
    } else if (this.configuration) {
      if (this.can('connect')) {
        this.connect();
      }

      return this.queue(message);
    }

    return false;
  };

  machine.sendAuthenticatedMessage = function(message) {
    this.socket.sendPacket('message', JSON.stringify(message));

    message.direction = 'out';
    log.info(message);
  };

  return machine;
}

module.exports = { create: create };

