var assert = require('assert'),
    Reconnector = require('../lib/reconnector.js');

exports['given a reconnector'] = {
  beforeEach: function(done) {
    this.reconnector = new Reconnector();
    done();
  },

  'memorizing a sync/subscribe should work': function(done) {
    assert.equal(0, Object.keys(this.reconnector.subscriptions).length);
    this.reconnector.memorize({ op: 'subscribe', to: 'foo'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);

    this.reconnector.memorize({ op: 'sync', to: 'bar'});
    assert.equal(2, Object.keys(this.reconnector.subscriptions).length);

    this.reconnector.memorize({ op: 'get', to: 'bar' });
    // should be a no-op
    assert.equal(2, Object.keys(this.reconnector.subscriptions).length);

    done();
  },

  'memorizing a set(online) and unmemorizing a set(offline) should work': function(done) {
    assert.equal(0, Object.keys(this.reconnector.presences).length);
    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar', value: 'online' });
    assert.equal('online', this.reconnector.presences['presence:/foo/bar'].value);
    assert.equal(1, Object.keys(this.reconnector.presences).length);
    // duplicate should be ignored
    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar', value: 'online' });
    assert.equal(1, Object.keys(this.reconnector.presences).length);

    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar', value: 'offline' });
    assert.equal(1, Object.keys(this.reconnector.presences).length);
    assert.equal('offline', this.reconnector.presences['presence:/foo/bar'].value);
    done();
  },

  'memorizing a unsubscribe should remove any sync/subscribe': function(done) {
    // set up
    this.reconnector.memorize({ op: 'subscribe', to: 'foo'});
    this.reconnector.memorize({ op: 'sync', to: 'bar'});
    assert.equal(2, Object.keys(this.reconnector.subscriptions).length);
    // unsubscribe
    this.reconnector.memorize({ op: 'unsubscribe', to: 'foo'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    this.reconnector.memorize({ op: 'unsubscribe', to: 'bar'});
    assert.equal(0, Object.keys(this.reconnector.subscriptions).length);
    done();
  },

  'duplicated subscribes and syncs should only be stored once and sync is more important than subscribe': function(done) {
    // simple duplicates
    this.reconnector.memorize({ op: 'subscribe', to: 'foo'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    this.reconnector.memorize({ op: 'subscribe', to: 'foo'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);


    this.reconnector.subscriptions = {};
    // simple duplicates
    this.reconnector.memorize({ op: 'sync', to: 'abc'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    this.reconnector.memorize({ op: 'sync', to: 'abc'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);

    this.reconnector.subscriptions = {};
    // sync after subscribe
    this.reconnector.memorize({ op: 'sync', to: 'bar'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    this.reconnector.memorize({ op: 'sync', to: 'bar'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    assert.equal('sync', this.reconnector.subscriptions['bar']);

    this.reconnector.subscriptions = {};
    // subscribe after sync
    this.reconnector.memorize({ op: 'sync', to: 'baz'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    assert.equal('sync', this.reconnector.subscriptions['baz']);
    // if we sync and subscribe, it means just sync
    this.reconnector.memorize({ op: 'subscribe', to: 'baz'});
    assert.equal(1, Object.keys(this.reconnector.subscriptions).length);
    assert.equal('sync', this.reconnector.subscriptions['baz']);

    done();
  },

  // restore tests are best written as full client tests since there is a lot going on (server side, client side...)
  'restore must discard old presence offline sets': function(done){
    this.reconnector.client = {};
    var total = 0;
    this.reconnector.client.set = function(to, value, ack){
      total++;
      if(to == 'presence:/foo/bar1'){
        assert.equal(value, 'online');
      }else if(to =='presence:/foo/bar2'){
        assert.equal(value, 'offline');
      }else if(to =='presence:/foo/bar3') {
        assert.ok(false);
      }
    };

    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar1', value: 'online' });
    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar3', value: 'offline' });
    this.reconnector.presences['presence:/foo/bar3'].time = new Date().getTime()/1000 - 200;
    this.reconnector.memorize({ op: 'set', to: 'presence:/foo/bar2', value: 'offline' });


    this.reconnector.restore();
    setTimeout(function() {
      assert.equal(total, 2);
      done();
    }, 10);
  },

  'queue must not queue memorized messages': function(done){
    this.reconnector.queue({ op: 'set', to: 'presence:/foo/bar1', value: 'online' });
    this.reconnector.queue({ op: 'sync', to: 'abc' });
    this.reconnector.queue({ op: 'subscribe', to: 'def'});
    this.reconnector.queue({ op: 'unsubscribe', to: 'ghi'});
    this.reconnector.queue({ op: 'get', to: 'status:/foo/bar1'});

    assert.equal(this.reconnector.mqueue.length, 1);
    assert.equal(this.reconnector.mqueue[0].op, 'get');
    done();
  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
