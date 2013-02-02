var assert = require('assert');
var timer = require('../lib/bench-timer');

console.log('test passing arguments to complete');

timer('testSync', function() { })
  .oncomplete(function(name, time, args) {
    assert.ok(Array.isArray(args));
    assert.strictEqual(args[0], true);
    assert.strictEqual(args[1], 1);
  }, [true, 1]);

timer('testSyncNull', function() { })
  .oncomplete(function(name, time, args) {
    assert.strictEqual(args, null);
  });

timer('testAsync')
  .onend(function(name, time, iter, args) {
    assert.ok(Array.isArray(args));
    assert.strictEqual(args[0], true);
    assert.strictEqual(args[1], 1);
  }, [true, 1]).end();

timer('testAsyncNull')
  .onend(function(name, time, iter, args) {
    assert.strictEqual(args, null);
  }).end();
