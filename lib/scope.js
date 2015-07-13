var Message = require('./message.js');

function Scope(prefix, client) {
  this.prefix = prefix;
  this.client = client;
}

var props = [ 'set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync'];

var init = function (name) {
  Scope.prototype[name] = function () {
    var message_type = this.prefix.substring(0, this.prefix.indexOf(':'));
    var valid_ops = Message.getOpsForMessageType(message_type);

    if (valid_ops.indexOf(name) >= 0) {
      var args = Array.prototype.slice.apply(arguments);
      args.unshift(this.prefix);
      this.client[name].apply(this.client, args);
      return this;
    }
  };
};

for (var i = 0; i < props.length; i++){
  init(props[i]);
}

module.exports = Scope;
