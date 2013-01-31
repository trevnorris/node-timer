/* Run test with the following:
 *
 * --octal 0666 --float 1e3 --decimal 1.3 --dual 1 2 --bool
 *
 */

var assert = require('assert');
var timer = require('../lib/bench-timer');
var params = timer.parse(process.argv);
var expected = {
                octal: 0666,
                float: 1e3,
                decimal: 1.3,
                dual: [1, 2],
                bool: true
               };

console.log('test passed parameters');

assert.deepEqual(params, expected);
