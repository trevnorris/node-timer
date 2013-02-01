/* Run test with the following:
 *
 * --exec test0
 *
 */

var timer = require('../lib/bench-timer');
var params = timer.parse(process.argv);
var fn = function() { };

timer('test0', fn).complete(fn);

timer('test1', fn).complete(fn);
