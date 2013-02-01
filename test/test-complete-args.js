var assert = require('assert');
var timer = require('../lib/bench-timer');

console.log('test passing arguments to complete');

timer('testSync', function() { })
  .complete(function(name, time, args) {
    assert.ok(Array.isArray(args));
    assert.strictEqual(args[0], true);
    assert.strictEqual(args[1], 1);
  }, [true, 1]);

timer('testSyncNull', function() { })
  .complete(function(name, time, args) {
    assert.strictEqual(args, null);
  });
