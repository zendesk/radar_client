var Manager = require('../lib/state.js'),
    assert = require('assert'),
    Minilog = require('minilog'),
    log = Minilog('test'),
    stdoutPipe = Minilog.pipe(Minilog.backends.nodeConsole);

// configure log output
stdoutPipe
  .filter(Minilog.backends.nodeConsole.filterEnv("*"))
  .format(Minilog.backends.nodeConsole.formatWithStack);

module.exports = {
  beforeEach: function() {
    this.manager = Manager.create();
  },
  'while connecting after failure': {
    'should timeout connect after a while': function(done) {
      this.manager.on('unavailable', done);
      this.manager._backoff.failures = 100;
      this.manager._connectTimeout = 200;
      this.manager.connect();
      log.info("after connecting");
    },
    'should not get caught by timeout if connect fails for different reasons' : function(done) {
        var manager = this.manager;
        var once = true;
        this.timeout(2000);
        var disconnects = 0;

        manager._connectTimeout = 1000; //connect times out after 1 second
        manager._backoff.get = function() { return 100; };
        manager.on('disconnect', function() {
          disconnects++;
        });

        setTimeout(function() {
          assert.equal(disconnects, 1); // only 1 disconnect due to manager.disconnect()
          done();
        }, 1500);

        manager.on('connect', function() {
          if(once) {
            manager.disconnect();
            once = false;
          }else {
            manager.established();
          }
        });
        manager.connect();
    }
  }
};
