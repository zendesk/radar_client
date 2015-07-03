function Scope(prefix, client) {
  this.prefix = prefix;
  this.client = client;
}

var props = [ 'history' ,'set', 'get', 'subscribe', 'unsubscribe', 'publish', 
  'push', 'sync', 'synced','on', 'once', 'when', 'removeListener', 'removeAllListeners'];

var init = function(name) {
  Scope.prototype[name] = function () {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(this.prefix);
    this.client[name].apply(this.client, args);
    return this;
  };
};

for(var i = 0; i < props.length; i++){
  init(props[i]);
}

module.exports = Scope;
