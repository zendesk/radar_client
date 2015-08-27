var logger = require('minilog')('message:response');

function Response (message) {
  this.message = message;
  this.validate();
}

Response.getAttr = function (message, attr) {
  return message && message[attr];
};

Response.prototype.getMessage = function () {
  return this.message;
};

Response.prototype.validate = function () {
  if (!this.message.op) {
    return;
  }

  switch(this.message.op) {
    case 'ack':
      if (!this.message.value) {
        logger.error('missing value');
      }
      break;

    default:
      if (this.message.op != 'err' && !this.message.to) {
        logger.error('missing to');
      }
  }
};

Response.prototype.isValid = function (request) {
  if (!request) {
    return !!this.message.to && !!this.message.value && !!this.message.time;
  } else if (this.getAttr('op') === 'ack') {
    return this.getAttr('value') === request.getAttr('ack');
  } else {
    return this.getAttr('to') === request.getAttr('to');
  }
};

Response.prototype.isFor = function (request) {
  return this.getAttr('to') === request.getAttr('to');
};

Response.prototype.isAckFor = function (request) {
  return this.getAttr('value') === request.getAttr('ack');
};

Response.prototype.getAttr = function (attr) {
  return this.message[attr];
};

Response.prototype.forceV1Response = function () {
  // Sync v1 for presence scopes is inconsistent: the result should be a 'get'
  // message, but instead is an 'online' message.  Take a v2 response and
  // massage it to v1 format prior to returning to the caller.
  var message = this.message, value = {}, userId;
  for (userId in message.value) {
    if (message.value.hasOwnProperty(userId)) {
      // Skip when not defined; causes exception in FF for 'Work Offline'
      if (!message.value[userId]) { continue; }
      value[userId] = message.value[userId].userType;
    }
  }
  message.value = value;
  message.op = 'online';
};

module.exports = Response;
