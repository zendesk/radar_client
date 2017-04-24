function Backoff () {
  this.failures = 0
}

Backoff.durations = [1000, 2000, 4000, 8000, 16000, 32000] // seconds (ticks)
Backoff.fallback = 60000
Backoff.maxSplay = 5000

Backoff.prototype.get = function () {
  var splay = Math.ceil(Math.random() * Backoff.maxSplay)
  return splay + (Backoff.durations[this.failures] || Backoff.fallback)
}

Backoff.prototype.increment = function () {
  this.failures++
}

Backoff.prototype.success = function () {
  this.failures = 0
}

Backoff.prototype.isUnavailable = function () {
  return Backoff.durations.length <= this.failures
}

module.exports = Backoff
