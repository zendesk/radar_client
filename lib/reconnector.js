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
        if(!this.presences[message.to] || this.presences[message.to].value != message.value) {
          this.presences[message.to] = { value: message.value, time: new Date().getTime()/1000 };
        }
      }
      break;
  }
};

Reconnector.prototype.queue = function(message) {
  //Donot queue memorized messages
  var discard = false;
  switch(message.op) {
    case 'unsubscribe':
    case 'sync':
    case 'subscribe':
      discard = true;
      break;
    case 'set':
      if (message.to.substr(0, 'presence:/'.length) == 'presence:/') {
        discard = true;
      }
      break;
  }

  if(!discard) {
    log.info('Queue message', message);
    this.mqueue.push(message);
  }
};

Reconnector.prototype.restore = function(done) {
  var self = this, total = 0, to, message;

  function ack() {
    self.waitCounter--;
    if(self.waitCounter === 0) {
      done();
    }
  }
  log.info({ event: 'restore-subscriptions' });
  for (to in this.subscriptions) {
    if (!this.subscriptions.hasOwnProperty(to)) { continue; }
    var item = this.subscriptions[to];
    this.waitCounter++;
    total++;
    this.client[item](to, ack);
  }

  for (to in this.presences) {
    if (!this.presences.hasOwnProperty(to)) { continue; }
    //remove offline presences older than 2 minutes
    if((this.presences[to].value == 'offline') && (this.presences[to].time < (new Date().getTime()/1000 - 120))) {
      delete this.presences[to];
      continue;
    }
    this.waitCounter++;
    total++;
    this.client.set(to, this.presences[to].value, ack);
  }
  message = this.mqueue.shift();
  while(message) {
    this.client.manager._sendPacket(JSON.stringify(message));
    message = this.mqueue.shift();
  }
  // if we didn't do anything, just trigger done()
  if(total === 0) {
    done();
  }
};

module.exports = Reconnector;
