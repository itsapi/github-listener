var test = require('tape'),
    through = require('through2'),
    common = require('./common')(),
    Listener = require('../listener');


var options = common.options;
var config = common.config;
var request = common.request;


function create_res (cb) {
  var res = {
    writeHead: function (code, headers) {
      res.statusCode = code;
      res.headers = headers;
    },
    end: function (data) {
      cb(res, data);
    }
  };
  return res;
}


test('BEGIN LISTENER TESTS', function (t) { t.end(); });


test('listener.constructor', function (t) {

  t.test('no arguments passed in', function (st) {
    var listener = new Listener();

    st.deepEqual(listener.config, undefined, 'correct listener.config');
    st.equal(listener.logging, undefined, 'correct listener.logging');
    st.equal(listener.status, 'Ready', 'correct listener.status');
    st.end();
  });

  t.test('config passed in', function (st) {
    var listener = new Listener(config);

    st.deepEqual(listener.config, config, 'correct listener.config');
    st.equal(listener.logging, undefined, 'correct listener.logging');
    st.equal(listener.status, 'Ready', 'correct listener.status');
    st.end();
  });

  t.test('logging flag passed in', function (st) {
    var listener = new Listener(config, false);

    st.deepEqual(listener.config, config, 'correct listener.config');
    st.equal(listener.logging, false, 'correct listener.logging');
    st.equal(listener.status, 'Ready', 'correct listener.status');
    st.end();
  });

});


test('listener.respond', function (t) {

  t.test('no arguments passed in', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, undefined, 'correct server response');
      st.equal(res.statusCode, undefined, 'correct status code');
      st.end();
    });

    listener.respond(res);
  });

  t.test('status code and message passed in', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Hello World', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });

    listener.respond(res, 200, 'Hello World');
  });

  t.test('listener.script_out set', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Hello World', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.equal(listener.script_out, 'Hello World', 'correct listener.script_out');
      st.end();
    });

    listener.respond(res, 200, 'Hello World');
  });

  t.test('not_refresh passed in', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Hello World', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.equal(listener.script_out, '', 'correct listener.script_out');
      st.end();
    });

    listener.respond(res, 200, 'Hello World', true);
  });

});


test('listener.error', function (t) {

  t.test('no arguments passed in', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, undefined, 'correct server response');
      st.equal(res.statusCode, undefined, 'correct status code');
      st.end();
    });

    listener.error(res);
  });

  t.test('status code and message passed in', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Error', 'correct server response');
      st.equal(res.statusCode, 500, 'correct status code');
      st.end();
    });

    listener.error(res, 500, 'Error');
  });

  t.test('listener.status set', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Error', 'correct server response');
      st.equal(res.statusCode, 500, 'correct status code');
      st.equal(listener.status, 'Error', 'correct listener.status');
      st.equal(listener.running, false, 'correct listener.running');
      st.equal(listener.script_out, 'Error', 'correct listener.script_out');
      st.end();
    });

    listener.error(res, 500, 'Error');
  });

});


test('listener.build', function (t) {

  t.test('listener.build is defined', function (st) {
    var listener = new Listener();

    st.ok('build' in listener, 'listener has build property');
    st.end();
  });

  t.test('nothing to build', function (st) {
    var listener = new Listener();

    var res = create_res(function (res, data) {
      st.equal(data, 'Nothing to build', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });

    listener.build(res);
  });

  t.test('run last build', function (st) {
    var listener = request('asdf', function (res, data) {
      st.equal(data, 'Error: Invalid payload', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');

      res = create_res(function (res, data) {
        st.equal(data, 'Error: Invalid payload', 'correct server response');
        st.equal(res.statusCode, 400, 'correct status code');
        st.end();
      });

      listener.build(res);
    });
  });

});


test('listener.run_when_ready', function (t) {

  t.test('no waiting', function (st) {
    var listener = new Listener(config);
    var start = Date.now();

    st.equal(listener.running, false, 'nothing runnning already');
    listener.run_when_ready(function () {
      var elapsed = Date.now() - start;

      st.ok(elapsed < 100, 'callback run immediately');
      st.end();
    });
  });

  t.test('wait until ready', function (st) {
    var listener = new Listener(config);
    var start = Date.now();

    listener.running = true;
    st.equal(listener.running, true, 'process already running');
    listener.run_when_ready(function () {
      var elapsed = Date.now() - start;

      st.equal(listener.running, false, 'process finished running');
      st.ok(elapsed > 500 && elapsed < 600, 'callback run after 500ms');
      st.end();
    });

    setTimeout(function () {
      listener.running = false;
    }, 500);
  });

});


test('listener.hook bl error', function (t) {
  var listener = new Listener(config);
  var req = new through();

  var res = create_res(function (res, data) {
    t.equal(data, 'Error whilst receiving payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.equal(listener.status, 'Error', 'correct listener.status');
    t.end();
  });

  listener.hook(req, res);
  req.emit('error', new Error('BOOM!'));
});
