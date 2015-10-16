function Backoff() {
  this.failures = 0;
}

//Backoff.durations = [1000, 2000, 4000, 8000, 16000, 32000]; // seconds (ticks)
var durations = [3000, 3000, 3000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
durations = durations.concat([2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000]);
durations = durations.concat([4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000]);
durations = durations.concat([10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]);
Backoff.durations = durations
Backoff.fallback = 20000;

Backoff.prototype.get = function() {
  return Backoff.durations[this.failures] || Backoff.fallback;
};

Backoff.prototype.increment = function() {
  this.failures++;
};

Backoff.prototype.success = function() {
  this.failures = 0;
};

Backoff.prototype.isUnavailable = function() {
  return Backoff.durations.length <= this.failures;
};

module.exports = Backoff;
