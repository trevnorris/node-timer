/* Description:
 *
 * Writes data from client to server. Both the client and server use the old
 * streams.
 *
 * Usage:
 *
 * --iter:   number of interval iterations (default: 20)
 * --nokill: should not kill process when intervals complete (default: false)
 * --ms:     number of ms between intervals (default: 1000)
 * --make:   output should follow make tests (default: false)
 * --noop:   cancel output and counters, useful for v8 flags (default: false)
 * --port:   which port to run the server (default: 1337)
 * --size:   set size of buffer (default: 0x100000)
 *
 * Example:
 *
 *   node tcp_net_c2s.js --port 3000 --size 0xffffff --iter 5
 */


var net = require('net');
var Timer = require('../../lib/node-timer');
var params = Timer.parse(process.argv);
var t_cb = require('../templates/_net')[params.make ? 'make' : 'cli'];
var tcp_net = Timer('tcp-net-c2s',
                     params.ms || 1000,
                     params.iter || 20,
                     !params.nokill);
var PORT = params.port || 1337;
var tbuf = new Buffer(params.size || 0x100000);
var client;

tbuf.fill(0);

tcp_net.oninterval(t_cb.oninterval);

tcp_net.onend(t_cb.onend);

if (params.noop)
  tcp_net.noop();


// begin benchmark

net.createServer(function(socket) {
  tcp_net.start();
  socket.on('data', function(chunk) {
    tcp_net.inc(chunk.length);
  });
}).listen(PORT);


client = net.connect(PORT, function() {
  (function w() {
    client.write(tbuf, w);
  }());
});
