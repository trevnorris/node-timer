/* Description:
 *
 * Writes data from server to client. The server uses the old streams while
 * the client is built directly from tcp_wrap.
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
 *   node tcp_netserver_s2c.js --port 3000 --size 0xffffff
 */


var TCP = process.binding('tcp_wrap').TCP;
var net = require('net');
var Timer = require('../../lib/node-timer');
var params = Timer.parse(process.argv);
var t_cb = require('../templates/_net')[params.make ? 'make' : 'cli'];
var tcp_netserver = Timer('tcp-netserver-s2c',
                           params.ms || 1000,
                           params.iter || 20,
                           !params.nokill);
var PORT = params.port || 1337;
var HOST = params.host || '127.0.0.1';
var tbuf = new Buffer(params.size || 0x100000);
var r_handle, c_req;

tbuf.fill(0);

tcp_netserver.oninterval(t_cb.oninterval);

tcp_netserver.onend(t_cb.onend);

if (params.noop)
  tcp_netserver.noop();


// begin benchmark

net.createServer(function(socket) {
  (function w() {
    socket.write(tbuf, w);
  }());
}).listen(PORT);


r_handle = new TCP();
c_req = r_handle.connect(HOST, PORT);

r_handle.onread = function(chunk, offset, length) {
  tcp_netserver.inc(length);
};

c_req.oncomplete = afterConnect;

function afterConnect(status, handle, req, readable, writable) {
  tcp_netserver.start();
  handle.readStart();
}
