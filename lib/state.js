var log = require('minilog')('radar_state'),
    Reconnector = require('./reconnector'),
    MicroEE = require('microee'),
    Backoff = require('./backoff');

function StateMachine() {
  this.connections = 0;
  this._state = StateMachine.states.stopped;
  this.socket = null;
  this.queue = [];
  this.transitionTimer = null;
  this.socketConfig = null;
  this.guard = null;
  this.backoff = new Backoff();
  this._timeout = null;

  // set sink, createSocket and handleMessage after creating the state machine
  this.sink = new MicroEE();
  this.createSocket = null;
  this.handleMessage = null;
  this.reconnector = null;
  this.waitingForConfig = false;
}

// Map of states
var states = StateMachine.states = {
  permanently_disconnected: -2, // service unavailable or config error
  // Disconnect states
  stopped: -1, // disconnected and not looking to connect
  waiting: 1, // waiting to reconnect, exponential backoff
  reconnect: 2, // disconnected for reason other than explicit disconnect()
  disconnecting: 3, // actively transitioning to "stopped" state
  // Connect states
  connecting: 4, // actively transitioning to "connected" state
  connected: 5, // connected but still need to resync etc.
  ready: 6 // connected and any lost subs/syncs re-established
};

StateMachine.prototype.set = function(to) {
  if(typeof to !== 'undefined') {
    log.debug('change state from', this._state, 'to', to);
    this._state = to;
  }
};

StateMachine.prototype.configure = function(sink, config) {
  config || (config = {});
  config.upgrade = false;
  this.socketConfig = config;
  sink && (this.sink = sink);
  if(this.waitingForConfig && this._state == states.stopped) {
    this.waitingForConfig = false;
    this.connect();
  }
};

StateMachine.prototype.connect = function() {
  if(this._state == states.stopped && this.socketConfig) {
    this.reconnector = new Reconnector(this.sink);
    // you can only start if you've stopped. Other states have a defined transition path.
    this.set(states.reconnect);
  } else {
    this.waitingForConfig = true;
  }
  this.run();
};

// StateMachine manages sending messages, because it can easily handle connecting on demand
StateMachine.prototype.send = function(message) {
  if(this._state < 0) {
    // ignore calls when not configured and not connected
    if(!this.socketConfig || !this.sink) return;
    // otherwise connect automatically
    this.connect();
  }
  if(this._state < 5) {
    this.reconnector.queue(message);
  }
  // persistence
  this.reconnector.memorize(message);
  this.socket.sendPacket('message', JSON.stringify(message));
};

StateMachine.prototype.disconnect = function() {
  var self = this;
  log.info('disconnect() called');
  if(!this.socketConfig) {
    this.waitingForConfig = false;
    return;
  }
  this.set(states.disconnecting);
  if(this.socket) {
    // clear listeners
    this.socket.removeAllListeners('close');
    // stop
    this.socket.on('close', function() {
      self.set(states.stopped);
    });
    this.socket.close();
  }
  this.run();
};

// never directly called. Everything goes through the state machine
StateMachine.prototype._connect = function() {
  if(this._state != states.reconnect) {
    log.error('Connect is only allowed from reconnecting state!');
    return;
  }
  var self = this;
  // reconnect, guard against duplicate connections if a connect attempt is already on the way
  var socket = this.socket = this.createSocket(this.socketConfig);
  socket.once('open', function () {
    self.set(states.connected);
    self.run();
  });
  socket.on('message', this.handleMessage);
  socket.once('close', function() { self.handleDisconnect(); });

  this._startGuard(function() {
    log.warn('Connect guard timed out');
    self.handleDisconnect();
  }, this.backoff.get() + 6000);
  this.set(states.connecting);
};

StateMachine.prototype.handleDisconnect = function() {
  // exponential backoff
  this._cancelGuard();
  this.backoff.increment();
  this.set(states.reconnect);
  if(this.backoff.get() > 9000000) {
    this.set(states.permanently_disconnected);
    this.retransition(1000);
  } else {
    this.retransition(this.backoff.get());
  }
  this.sink.emit('disconnected');
  log.info('disconnected - reconnecting in', this.backoff.get());
};

StateMachine.prototype.run = function() {
  var self = this,
      s = StateMachine.states;

  if(this.socketConfig){
    log.debug('[C '+this.socketConfig.userId+'] run state', this._state);
  }

  switch(this._state) {
    case s.permanently_disconnected:
      this.sink.emit('unavailable');
      break;
    case s.stopped:
      this.sink.emit('disconnected');
      break;
    case s.waiting:

      break;
    case s.reconnect:
      this._connect(this.socketConfig);
      break;
    case s.disconnecting:
    case s.connecting:
      // if we are connecting/disconnecting, set a timeout to check again later
      this.retransition(1000);
      break;
    case s.connected:
      this._cancelGuard();
      this.reconnector.restore(function() {
        self.set(s.ready);
        self.run();
      });
      break;
    case s.ready:
      this.connections++;
      this.backoff.success();
      if(this.connections == 1) {
        this.sink.emit('connected');
      } else {
        this.sink.emit('reconnected');
      }
      this.sink.emit('ready');
      break;
  }
};

StateMachine.prototype.retransition = function(timeout) {
    var self = this;
    this._timeout = timeout;
    if(!this.transitionTimer) {
      this.transitionTimer = setTimeout(function() {
        self.transitionTimer = null;
        log.info('Ran transition after', timeout);
        self.run();
      }, timeout);
    }
};

StateMachine.prototype._startGuard = function(callback, timeout) {
  log.debug('start guard', timeout);
  this.guard && clearTimeout(this.guard);
  this.guard = setTimeout(callback, timeout);
};

StateMachine.prototype._cancelGuard = function() {
  log.debug('cancel guard');
  this.guard && clearTimeout(this.guard);
};

StateMachine._setTimeout = function(fn) {
  /*globals setTimeout:true */
  setTimeout = fn;
};

module.exports = StateMachine;
