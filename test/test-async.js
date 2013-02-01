var timer = require('../lib/bench-timer');

var test0 = timer('test0');

test0.complete(function() {
  console.log('test0', arguments);
  test2.start();
});

test0.start();

var test1 = timer('test1',1000,5);

test1.complete(function() {
  console.log('test1', arguments);
  test0.end();
});

test1.start();

setInterval(function() {
  test1.inc();
}, 20);

var test2 = timer('test2', 1000, 5, true);

test2.start(function() {
  setInterval(function() {
    test2.inc();
  }, 10);
});

test2.complete(function() {
  console.log('test2', arguments);
});
