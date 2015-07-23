var logger = require('minilog')('message:response');

var Response = function (message, requestMessage) {
  this.message = message;
  this.requestMessage = requestMessage;

  if (!this.isValid()) {
    throw new Error('Invalid response message.');
  }
};

Response.parse = function (data, requestMessage) {
  if (data) {
    return new Response(data, requestMessage);
  }
};

Response.getAttr = function (message, attr) {
  return message && message[attr];
};

// Instance methods

Response.prototype.getMessage = function () {
  return this.message;
};

Response.prototype.isValid = function () {
  // TO DO: validate *value* ?
  if (this.message.op === 'ack') {
    return this.message.value === this.requestMessage.ack;
  }
  else {
    return this.message.op && this.message.to &&
            this.message.to === this.requestMessage.to;
  }
};

Response.prototype.forceV2Presence = function () {
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
