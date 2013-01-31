/*
 * This is a simple addition to allow for higher resolution timers. It can be
 * used to track time for both synchronous or asynchronous calls.
 *
 * For synchronous timers, pass a callback function like so:
 *
 *  var timer = require('bench-timer');
 *
 *  timer('myTest', function() {
 *    for (var i = 0; i < 1e6; i++)
 *      // ... run something here
 *  });
 *
 * To reduce the effect one test has on another, each one is run in a setTimeout
 * at a default 300ms. This value can be changed by passing a value to
 * `timer.delay()`. Note that sync timers still retain their run order.
 *
 * Asynchronous timers can also be used. To create one, just pass the name.
 * These timers do not start timing immediately. To start, run `.start()`, and
 * to complete the timer run `.end()`.
 *
 *  var my_timer = timer('checkAsync');
 *
 *  my_timer.start();
 *  setTimeout(function() {
 *    my_timer.end();
 *  }, 300);
 *
 * When `.end()` is called, the `.complete()` method will be called. These two
 * can be run any number of times. The time difference between the most recent
 * `.start()` and `.end()` will be passed to the `.complete()` function.
 *
 * To use the asynchronous timer for printing iterations at interval, pass the
 * number of ms between log intervals you would like to use as the second
 * argument. Then call `.inc()` to increment the internal counter. A
 * numeric value can also be passed to `.inc()`.
 *
 *  var async_timer = timer('asyncCounter', 1000);
 *
 *  async_timer.start();
 *  setInterval(function() {
 *    async_timer.inc(5);
 *  }, 20);
 *
 * This will continue indefinitely for the life of the script. Though any async
 * timer can be terminated at any time by running `.end()`. This will call the
 * `.end()` and `.complete()` methods.
 *
 * Note: `.start()` does not prevent the timer from being incremented. It only
 *       indicates when you want the timer to begin running the `.interval()`
 *       function.
 *
 * You can instruct the test to terminate after a given number of iterations by
 * passing a third argument:
 *
 *  var async_term = timer('asyncTerminate', 1000, 10);
 *
 *  async_term.start();
 *  setInterval(function() {
 *    async_term.inc();
 *  }, 20);
 *
 * This can also be triggered manually by calling `.cancel()`. This will kill
 * the timer interval, but not clear the counter. The timer can be started again
 * simply by running `.start()`.
 *
 * If you wish to terminate the script completely after N iterations, pass true
 * as the fourth argument:
 *
 *  var async_kill = timer('asycKill', 1000, 10, true);
 *
 *  async_kill.start();
 *  setInterval(function() {
 *    async_kill.inc();
 *  }, 20);
 *
 * Async timers run a function every interval. By default it prints a message
 * about the number of counters collected between intervals. If you wish to
 * change this, pass a function to `.interval()`:
 *
 *  var async_inter = timer('asyncInter', 1000, 10);
 *
 *  async_inter.interval(function(name, time, inc) {
 *    // timer - a process.hrtime() difference tuplet
 *    // inc - number of increments over time period
 *  });
 *
 * All timers run a single function once completed. Sync timers by default print
 * a message about the amount of time in microseconds the test took. Async
 * timers do not have one by default. To change this, pass a function to
 * `.complete()`
 *
 *  timer('someTimer', function() {
 *    // run stuff
 *  }).complete(function(name, time) {
 *    // print results, log to file or have a beer
 *  });
 *
 * Included is a simple arguments parser to ease test parameterization. Run this
 * by passing `process.argv` to `timer.parse()`:
 *
 *  var params = timer.parse(process.argv);
 *  var iterations = timer.iter;
 *
 * The parser will automatically check and convert values that can be
 * represented numerically. Otherwise they'll be left as strings.
 *
 * The first time a flag is received, it will assume that flag is a toggle and
 * set the returned name to true. If one parameter is passed to the flag then
 * it will set the string/number. If multiple are passed then it will create an
 * array. For example, the following:
 *
 *  $ ../node my_test.js --exec 'test 1' 'test 2' --iter 1e6 --slow
 *
 * will return:
 *
 *  {
 *    exec: ['test 1', 'test 2'],
 *    iter: 1e6,
 *    slow: true
 *  }
 *
 * There is one flag reserved by timer. The `--exec` flag indicates which sync
 * timers the user wants to run. If no parameters are passed to `--exec`, then
 * no tests will run. Filtering async tests is not supported at this time.
 *
 * Note: All timer parameters need to start with `--`.
 *
 * Note: All tests need to be initialized during script parsing. Don't place a
 *       benchmark in a setTimeout, etc.
 */

module.exports = timer;

var sync_queue = [];
var name_max_length = 0;
var delay = 300;
var to_exec = false;
var rx_add_commas = /(\d)(?=(\d\d\d)+(?!\d))/g;
var rx_parse_params = /^--[^-]/;
var rx_int = /^0|x/;

// all sync tests should be loaded by the end of file parsing
setTimeout(runSyncTests, delay);

// var my_timer = timer(name, [fn][iter, term, kill]);
function timer(name, fn, term, kill) {
  if (name.length > name_max_length)
    name_max_length = name.length;
  return typeof fn == 'function' ?
          new initSync(name, fn) :
          new initAsync(name, fn, term, kill);
}

timer.delay = function(ms) {
  if (ms > 0)
    delay = parseInt(ms);
};

// var params = timer.parse(process.argv);
timer.parse = function(argv) {
  var obj = {};
  var current, tmpargv, i;
  if (!Array.isArray(argv))
    throw TypeError('argv must be an array');
  // turn argv into parameters object
  for (i = 2; i < argv.length; i++) {
    if (rx_parse_params.test(argv[i])) {
      current = argv[i].substr(2);
      obj[current] = true;
    } else if (current) {
      if (isFinite(argv[i])) {
        if (rx_int.test(argv[i]))
          tmpargv = parseInt(argv[i]);
        else
          tmpargv = parseFloat(argv[i]);
      } else {
        tmpargv = argv[i];
      }
      if (obj[current] === true) {
        obj[current] = tmpargv;
      } else {
        if (!Array.isArray(obj[current]))
          obj[current] = [obj[current]];
        obj[current].push(tmpargv);
      }
    }
  }
  // parse tests to run
  if (obj.exec) {
    to_exec = {};
    if (Array.isArray(obj.exec))
      for (i = 0; i < obj.exec.length; i++)
        to_exec[obj.exec[i]] = true;
    else
      to_exec[obj.exec] = true;
  }
  return obj;
};

function initSync(name, fn) {
  this.name = name;
  this.fn = fn;
  // filter tests to automatically run based on params
  if (!(to_exec && !to_exec[name]))
    sync_queue.push(this);
  return this;
}

initSync.prototype = {
  _complete: printTime,
  complete: function complete(fn) {
    if (typeof fn != 'function')
      throw TypeError('callback must be a function');
    this._complete = fn;
  }
};

function initAsync(name, delay, term, kill) {
  this.name = name;
  this._counter = 0;
  if (isFinite(delay)){
    this._complete = false;
    this._delay = delay >= 0 ? parseInt(delay) : 0;
    this._interval = printIntervalTime;
    this._kill = !!kill;
    this._start = asyncIntStart;
    this._term = isFinite(term) && term > 0 ? parseInt(term) - 1 : false;
  } else {
    this._complete = asyncTermComplete;
    this._start = asyncTermStart;
  }
  this._usr_start = false;
  return this;
}

initAsync.prototype = {
  _end: function _end() {
    var _this = this;
    var name = _this.name;
    var time = process.hrtime(_this._hrtime);
    var counter = _this._counter;
    if (_this._setinterval)
      _this.cancel();
    setTimeout(function endSetTimeout() {
      if (_this._complete)
        _this._complete(name, time, counter);
      if (_this._kill)
        process.exit();
    }, 0);
  },
  cancel: function cancel() {
    clearInterval(this._setinterval);
  },
  complete: function complete(fn) {
    if (typeof fn != 'function')
      throw TypeError('callback must be a function');
    this._complete = fn;
  },
  end: function end(fn) {
    if (fn) {
      if (typeof fn != 'function')
        throw TypeError('callback must be a function');
      else
        this._end = fn;
    } else {
      this._end();
    }
  },
  inc: function inc(n) {
    // time intensive, no strict checking
    if (n != null)
      this._counter += n;
    else
      this._counter++;
  },
  interval: function interval(fn) {
    if (typeof fn != 'function')
      throw TypeError('callback must be a function');
    this._interval = fn;
  },
  start: function start(fn) {
    if (fn) {
      if (typeof fn != 'function')
        throw TypeError('callback must be a function');
      else
        this._usr_start = fn;
    } else {
      this._start();
    }
  }
};

function asyncTermComplete(name, time, counter) {
  printTime(name, time);
  // if counter is passed then iteration limit has been reached
  if (counter)
    printIntervalTime(name, time, counter);
}

function asyncTermStart() {
  this._hrtime = process.hrtime();
  if (this._usr_start)
    this._usr_start();
}

function asyncIntStart() {
  var _this = this;
  // for interval tests, _hrtime is when the test fist started
  var prev_time = _this._hrtime = process.hrtime();
  // if user has set a start function, run it
  if (_this._usr_start)
    _this._usr_start();
  _this._setinterval = setInterval(function asyncSetInterval() {
    prev_time = process.hrtime(prev_time);
    _this._interval(_this.name, prev_time, _this._counter);
    if (_this._term !== false) {
      if (_this._term > 0)
        _this._term--;
      else
        _this._end();
    }
    _this._counter = 0;
    prev_time = process.hrtime();
  }, this._delay);
}

function printIntervalTime(name, time, counter) {
  var mstime = time[0] * 1e3 + time[1] / 1e6;
  name += ': ';
  while (name.length < name_max_length + 2)
    name += ' ';
  console.log('%s%s/sec',
              name,
              (counter / mstime * 1e3).toFixed(2)
                .replace(rx_add_commas, '$1,'));
}

function printTime(name, time) {
  name += ': ';
  while (name.length < name_max_length + 2)
    name += ' ';
  console.log('%s%s \u00b5s',
              name,
              Math.floor((time[0] * 1e6) + (time[1] / 1e3))
                .toString().replace(rx_add_commas, '$1,'));
}

function runSyncTests() {
  if (sync_queue.length < 1)
    return;
  setTimeout(function() {
    var test = sync_queue.shift();
    var hrtime = process.hrtime();
    test.fn();
    hrtime = process.hrtime(hrtime);
    test._complete(test.name, hrtime);
    runSyncTests();
  }, delay);
}
