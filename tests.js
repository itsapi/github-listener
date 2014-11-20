var http = require('http'),
    crypto = require('crypto'),
    fs = require('fs'),
    async = require('async'),
    test = require('tape'),
    through2 = require('through2'),
    Listener = require('./listener'),
    config = require('./config');


var options = {
  host: 'localhost',
  path: '/',
  port: '6003',
  method: 'POST',
  headers: {}
};

  var res = {
    writeHead: function(statusCode, headers) {
      res.statusCode = statusCode;
      res.headers = headers;
    }
  }


// Make request and log response
function make_req(options, payload, cb) {
  var listener = new Listener(config),
      req = through2();

  res.end = function(data) { cb(); };

  req.method = options.method;
  req.url = options.path;
  req.headers = options.headers;

  listener.hook(req, res);
  req.end(payload);
}


// Generate payload signature
function gen_payload_sig(secret, payload) {
  return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
}


/**** START TESTS ****/


async.series([
  function(cb) {
    console.log('Test 1: pass string as payload');
    var payload = 'asdf';
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 2: pass invalid JSON object');
    var payload = JSON.stringify({ property: 'false' });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 3: pass valid JSON object but invalid signature');
    var payload = JSON.stringify({ repository: { full_name: 'repo' } });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, 'asdf');
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 4: pass valid JSON object and valid signature');
    var payload = JSON.stringify({ repository: { full_name: 'repo' } });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 5: pass custom branch name');
    var payload = JSON.stringify({ repository: { full_name: 'repo' } });
    options.path = '/dev/';
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);
    make_req(options, payload, cb);
  }
]);

test('Test 1: pass string as payload', function(t) {
  var payload = 'asdf';
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function() {
    t.equal(res.statusCode, 400);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
  });

  t.end()
});
