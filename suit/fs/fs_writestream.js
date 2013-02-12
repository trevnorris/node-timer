/* General Usage:
 *
 * --chunk: size of chunk to write (default: 1 10 100 2048)
 * --file:  location of file to write (default: ./write_stream_throughput.out)
 * --fsize: total size of file to write in bytes (default: 256KB)
 * --type:  write string or buffer (default: both)
 *
 * Addional for specialized testing:
 *
 * --child: is child process
 * --name:  name of test
 *
 */

var timer = require('../../lib/node-timer');
var params = timer.parse(process.argv);
var chunk = params.chunk || [1, 10, 100, 2048];
var file = params.file || 'write_stream_throughput.out';
var fsize = params.fsize || 0x40000;
var type = params.type || ['string', 'buffer'];
var name = params.name || 'fs-write-stream';

// detect if parent or child is running
if (params.child) runTest();
else parent();

// set parent queue for tests to be run
function parent() {
  var queue = [];

  // not worrying about a better way to do this right now
  if (!Array.isArray(chunk))
    chunk = [chunk];
  if (!Array.isArray(fsize))
    fsize = [fsize];
  if (!Array.isArray(type))
    type = [type];

  chunk.forEach(function(c) {
    fsize.forEach(function(f) {
      type.forEach(function(t) {
        queue.push([c, f, t]);
      });
    });
  });

  run(queue);
}

// run single test in queue, and repeat until complete
function run(queue) {
  if (queue.length <= 0) return;

  var spawn = require('child_process').spawn;
  var node = process.execPath;
  var q = queue.shift();
  var qname = name + '-' + q[2] + '-' + q[0] + '-' + fmtSize(q[1]);
  var args = [__filename,
              '--child',
              '--chunk', q[0],
              '--file', file,
              '--fsize', q[1],
              '--type', q[2],
              '--name', qname];
  var child = spawn(node, args, { stdio: 'inherit' });

  child.on('close', function(code, signal) {
    if (code)
      throw new Error('Benchmark failed: ' + qname);
    run(queue);
  });
}


function runTest() {
  var fs = require('fs');
  var fs_timer = timer(name);
  var w_cntr = 0;
  var f, bits;

  fs_timer.onend(onend);

  if (type == 'buffer') {
    bits = new Buffer(chunk);
    bits.fill('a', 0, chunk);
  } else {
    bits = createString();
  }

  // try to remove the file if it exists
  try { fs.unlinkSync(file); } catch (e) {}

  f = fs.createWriteStream(file);

  f.on('drain', write);
  f.on('open', init);
  f.on('close', function() {
    try { fs.unlinkSync(file); } catch (e) {}
  });
  f.on('finish', function() {
    fs_timer.end(w_cntr);
  });

  function init() {
    fs_timer.start();
    write();
  }

  function write() {
    if (w_cntr >= fsize) return;
    do {
      w_cntr += chunk;
    } while (f.write(bits) !== false && w_cntr < fsize);
    if (w_cntr >= fsize) {
      fs_timer.end(w_cntr);
      f.end();
    }
  }
}

function createString() {
  var str = 'a';
  while (str.length * 2 < chunk)
    str += str;
  return str += str.substr(0, chunk - str.length);
}

function fmtSize(s) {
  var t;
  if (s <= 1024)
    return s + 'B';
  t = s / 1024;
  if (t / 1024 <= 1)
    return ~~t + 'KB';
  return ~~(t / 1024) + 'MB';
}

function onend(name, t, c, cntr) {
  var kbit = cntr / 1024;
  var sec = t[0] + t[1] / 1e9;
  var rate = (kbit / sec).toFixed(1) + ' kB/sec';
  process.stdout.write(name + ': ' + rate + '\n');
}
