function Scope (typeName, scope, client) {
  this.client = client
  this.prefix = this._buildScopePrefix(typeName, scope, client.configuration('accountName'))
}

var props = ['set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync']

var init = function (name) {
  Scope.prototype[name] = function () {
    var args = Array.prototype.slice.apply(arguments)
    args.unshift(this.prefix)
    this.client[name].apply(this.client, args)
    return this
  }
}

for (var i = 0; i < props.length; i++) {
  init(props[i])
}

Scope.prototype._buildScopePrefix = function (typeName, scope, accountName) {
  return typeName + ':/' + accountName + '/' + scope
}

module.exports = Scope
