var log = require('minilog')('radar_reconnect');

function Reconnector(client) {
  this.subscriptions = {};
  this.presences = {};
  this.mqueue = [];
  this.client = client;
  this.waitCounter = 0;
}

Reconnector.prototype.memorize = function(message) {
  switch(message.op) {
    case 'unsubscribe':
      // remove from queue
      if(this.subscriptions[message.to]) {
        delete this.subscriptions[message.to];
      }
      break;
    case 'sync':
    case 'subscribe':
      if(this.subscriptions[message.to] != 'sync') {
        this.subscriptions[message.to] = message.op;
      }
      break;
    case 'set':
      if (message.to.substr(0, 'presence:/'.length) == 'presence:/') {
        this.presences[message.to] = message.value;
      }
      break;
  }
};

Reconnector.prototype.queue = function(message) {
  log.info('Queue message', message);
  this.mqueue.push(message);
};

Reconnector.prototype.restore = function(done) {
  var self = this, total = 0, to, message;

  function ack() {
    self.waitCounter--;
    if(self.waitCounter === 0) {
      done();
    }
  }
  log.info('Restoring subscriptions and presence scopes.');
  for (to in this.subscriptions) {
    if (!this.subscriptions.hasOwnProperty(to)) { continue; }
    var item = this.subscriptions[to];
    this.waitCounter++;
    total++;
    this.client[item](to, ack);
  }

  for (to in this.presences) {
    if (!this.presences.hasOwnProperty(to)) { continue; }
    this.waitCounter++;
    total++;
    this.client.set(to, this.presences[to], ack);
  }
  message = this.mqueue.shift();
  while(message) {
    this.client.manager.socket.sendPacket('message', JSON.stringify(message));
    message = this.mqueue.shift();
  }
  // if we didn't do anything, just trigger done()
  if(total === 0) {
    done();
  }
};

module.exports = Reconnector;
