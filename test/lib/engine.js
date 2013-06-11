var MicroEE = require('microee'),
    log = require('minilog')('test');


function Socket() {
  var self = this;
  this._written = [];
}

MicroEE.mixin(Socket);

Socket.prototype.sendPacket = function(nop, data) {
  var message = JSON.parse(data);
  current._written.push(message);
  log(message);
  if(message.op == 'get' || message.op == 'sync') {
    current.emit('message', data);
  }
  // ACKs should be returned immediately
  if(message.ack) {
    current.emit('message', JSON.stringify({"op":"ack","value": message.ack}));
  }
};

Socket.prototype.close = function() {
  setTimeout(function() {
    current.emit('close');
  }, 5);
};

var current = new Socket();

function wrap() {
  current.removeAllListeners();
  setTimeout(function() {
    current.emit('open');
  }, 5);
  return current;
}

module.exports = {
  Socket: wrap,
  current: current
};
