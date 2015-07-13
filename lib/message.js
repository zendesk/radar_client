var logger = require('minilog')('radar:message');

var message_op_matrix = {
  control: ['nameSync'],
  message: ['publish', 'subscribe', 'sync', 'unsubscribe'],
  presence: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  status: ['get', 'set', 'subscribe', 'sync', 'unsubscribe'],
  stream: ['get', 'push', 'subscribe', 'sync']
};

function Message (op, to) {
  return {
    op : op,
    to : to
  };
}

// Return the array of operations that are valid for a message type
Message.getOpsForMessageType = function (type) {
  return message_op_matrix[type];
};

// Return message objects corresponding to the radar message specification V2

Message.requestGet = function (scope, options) {
  if (scope)
  {
    var message = Message('get', scope);
    Message.setOptions(message, options);

    return message;
  }
};

// options are required
Message.requestNameSync = function (scope, options) {
  if (scope && options)
  {
    var message = Message('nameSync', scope);
    message.options = options;

    return message;
  }
};

Message.requestPublish = function (scope, value) {
  if (scope && value) {
    var message = Message('publish', scope);
    message.value = value;

    return message;
  }
};

Message.requestPush = function (scope, resource, action, value) {
  if (scope && resource && action && value) {
    var message = Message('push', scope);
    message.resource = resource;
    message.action = action;
    message.value = value;

    return message;
  }
};

Message.requestSet = function (scope, value, key, type) {
  //if (scope && value && key && type) {
    var message = Message('set', scope);
    message.value = value;
    message.key = key;
    message.type = type;

    return message;
  //}
};

Message.requestSubscribe = function (scope, options) {
  var message = Message('subscribe', scope);
  Message.setOptions(message, options);

  return message;
};

Message.requestSync = function (scope, options) {
  var message = Message('sync', scope);
  Message.setOptions(message, options);
  
  return message;
};

Message.requestUnsubscribe = function (scope) {
  var message = Message('unsubscribe', scope);

  return message;
};

Message.setOptionsVersion = function (message, version) {
  if (message) {
    if (message.options) {
      message.options.version = version;
    } else {
      message.options = { version: version };
    }
  }
};

Message.setOptions = function (message, options) {
  if (options && typeof options != 'function') {
    message.options = options;
  }
};

Message.isOptionsSet = function (message) {
  return (message && !!message.options);
};

Message.isValidScope = function (message, scope) {
  return message && message.to && message.to === scope;
};

Message.requestForceV2Presence = function (message, scope) {
  // Sync v1 for presence scopes acts inconsistently. The result should be a
  // "get" message, but it is actually a "online" message.
  // So force v2 and translate the result to v1 format.
  ///message.options = message.options || { version : 2 };
  var value = {}, userId;
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

Message.setAck = function (message, ack) {
  if (message && ack) {
    message.ack = ack;
  }
};

Message.getAck = function (message) {
  return (message && message.ack);
};

Message.isValidAck = function (responseMessage, requestMessage) {
  var valid = responseMessage && responseMessage.value &&
              responseMessage.value === requestMessage.ack;

  return valid;
};

Message.getOp = function (message) {
  return (message && message.op);
};

Message.getTo = function (message) {
  return (message && message.to);
};

Message.getValue = function (message) {
  return (message && message.value);
};

Message.getTime = function (message) {
  return (message && message.time);
};

// TO DO: config class should return the required data via getters
Message.setUserData = function (message, configuration) {
  message.userData = configuration && configuration.userData;
};

// TO DO: config class should return the required data via getters
Message.setAuthData = function (message, configuration) {
  if (configuration && configuration.auth) {
    message.auth = configuration.auth;
    message.userId = configuration.userId;
    message.userType = configuration.userType;
    message.accountName = configuration.accountName;
  }
};

module.exports = Message;
