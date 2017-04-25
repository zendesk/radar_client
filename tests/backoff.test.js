var assert = require('assert')
var Backoff = require('../lib/backoff.js')

exports['given a backoff'] = {
  beforeEach: function (done) {
    this.b = new Backoff()
    done()
  },

  /*

  Some properties of a nice backoff system:

  - Exponential
  - However, random connection errors should not force the user to wait for a long time.
  - Random error = an error that does not repeat itself within a short time.

  */

  'durations increase as failures increase': function (done) {
    var b = this.b
    Backoff.durations.forEach(function (duration) {
      var v = b.get()
      assert(duration <= v)
      assert(duration + Backoff.maxSplay > v)
      b.increment()
    })
    done()
  },

  'successful connection resets durations so that a random error doesnt cause a long wait': function (done) {
    var b = this.b
    assert(b.get() >= 1000)
    b.increment()
    assert(b.get() >= 2000)
    b.success()
    var v = b.get()
    assert(v >= 1000 && v < 6000)
    done()
  },

  'seven failures should cause a permanent disconnect': function (done) {
    var b = this.b
    b.increment()
    b.increment()
    b.increment()
    b.increment()
    b.increment()
    b.increment()
    b.increment()
    assert(b.get() > 60000)
    done()
  }

}

// When this module is the script being run, run the tests:
if (module === require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ])
  mocha.stdout.pipe(process.stdout)
  mocha.stderr.pipe(process.stderr)
}
