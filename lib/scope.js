function Scope (typeName, scope, client) {
  this.client = client
  this.prefix = this._buildScopePrefix(typeName, scope, client.configuration('accountName'))
}

const props = ['set', 'get', 'subscribe', 'unsubscribe', 'publish', 'push', 'sync',
  'on', 'once', 'when', 'removeListener', 'removeAllListeners', 'nameSync']

const init = function (name) {
  Scope.prototype[name] = function () {
    const args = Array.prototype.slice.apply(arguments)
    args.unshift(this.prefix)
    this.client[name].apply(this.client, args)
    return this
  }
}

for (let i = 0; i < props.length; i++) {
  init(props[i])
}

Scope.prototype._buildScopePrefix = function (typeName, scope, accountName) {
  return typeName + ':/' + accountName + '/' + scope
}

module.exports = Scope
