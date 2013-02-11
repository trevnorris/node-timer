var arr = [1, 2];
var obj = { fn: function extern(arg0, arg1) { return arg0 + arg1; }}

for (var i = 0; i < 1e8; i++) {
  obj.fn(arr[0], arr[1]);
  if (i % 1e6 === 0)
    obj.fn(arr[0], arr[1], arr[2]);
}
