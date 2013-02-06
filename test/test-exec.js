/* Run test with the following:
 *
 * --exec test0
 *
 */

var timer = require('../lib/bench-timer');
var params = timer.parse(process.argv);

function fn() { }

timer('test0', fn).oncomplete(function(name) {
  console.log(name + ' complete');
});

timer('test1', fn).oncomplete(function(name) {
  console.log(name + ' complete');
});
