/* Description:
 *
 * Writes data from server to client. The client uses the old streams while
 * the server is built directly from tcp_wrap.
 *
 * This test is very simplified. No test for highWatermark is performed. Data
 * is not paused. This simply tests how quickly the data can be written.
 *
 * Usage:
 *
 * --iter:   number of interval iterations (default: 20)
 * --host:   host to bind on (default: 127.0.0.1)
 * --nokill: should not kill process when intervals complete (default: false)
 * --ms:     number of ms between intervals (default: 1000)
 * --make:   output should follow make tests (default: false)
 * --noop:   cancel output and counters, useful for v8 flags (default: false)
 * --port:   which port to run the server (default: 1337)
 * --size:   set size of buffer (default: 0x100000)
 *
 * Example:
 *
 *   node tcp_netclient_s2c.js --port 3000 --size 0xffffff
 */


var TCP = process.binding('tcp_wrap').TCP;
var net = require('net');
var Timer = require('../../lib/node-timer');
var params = Timer.parse(process.argv);
var t_cb = require('../templates/_net')[params.make ? 'make' : 'cli'];
var tcp_netclient = Timer('tcp-netclient-s2c',
                           params.ms || 1000,
                           params.iter || 20,
                           !params.nokill);
var PORT = params.port || 1337;
var HOST = params.host || '127.0.0.1';
var writeWaterMark = params.write || 0x4000;
var tbuf = new Buffer(params.size || 0x100000);
var s_handle, client;

tbuf.fill(0);

tcp_netclient.oninterval(t_cb.oninterval);

tcp_netclient.onend(t_cb.onend);

if (params.noop)
  tcp_netclient.noop();


// begin benchmark

s_handle = new TCP();

s_handle.bind(HOST, PORT);
s_handle.listen(511);
s_handle.onconnection = onconnection;


client = net.connect(PORT, function() {
  tcp_netclient.start();
});

client.on('data', function(chunk) {
  tcp_netclient.inc(chunk.length);
});


function onconnection(c_handle) {
  c_handle.server = true;
  (function w() {
    c_handle.writeBuffer(tbuf).oncomplete = w;
  }());
}
