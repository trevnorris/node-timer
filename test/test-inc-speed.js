var timer = require('../lib/bench-timer');
var params = timer.parse(process.argv);
var iter = params.iter || 1e8;
var obj = { noop: noop };

function noop() { }

var aN = timer('asyncNoop');
var aNT = timer('asyncNoopTracker');
aN.noop();
setTimeout(function() {
  aNT.start();
  aN.start();
  for (var i = 0; i < iter; i++)
    aN.inc();
  aN.end();
  aNT.end();
}, 15);

var eF = timer('emptyFor');
setTimeout(function() {
  eF.start();
  for (var i = 0; i < iter; i++);
  eF.end();
}, 15);

var eN = timer('emptyNoop');
setTimeout(function() {
  eN.start();
  for (var i = 0; i < iter; i++)
    noop();
  eN.end();
}, 15);

var eNO = timer('emptyNoopObj');
setTimeout(function() {
  eNO.start();
  for (var i = 0; i < iter; i++)
    obj.noop();
  eNO.end();
}, 15);

var eA = timer('emptyAsync');
setTimeout(function() {
  eA.start();
  eA.end();
}, 15);

var aF = timer('asyncForloop');
aF.onend(noop);
setTimeout(function() {
  aF.start();
  for (var i = 0; i < iter; i++)
    aF.inc();
  aF.end();
}, 15);
