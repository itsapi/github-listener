var http = require('http'),
    crypto = require('crypto'),
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

  res.end = cb;

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


test('Test 1: pass string as payload', function(t) {
  var payload = 'asdf';
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function(data) {
    t.equal(data, 'Error: Invalid payload');
    t.equal(res.statusCode, 400);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
    t.end()
  });
});

test('Test 2: pass invalid JSON object', function(t) {
  var payload = JSON.stringify({ property: 'false' });
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function(data) {
    t.equal(data, 'Error: Invalid data');
    t.equal(res.statusCode, 400);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
    t.end()
  });
});

test('Test 3: pass valid JSON object but invalid signature', function(t) {
  var payload = JSON.stringify({ repository: { full_name: 'repo' } });
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, 'asdf');

  make_req(options, payload, function(data) {
    t.equal(data, 'Error: Cannot verify payload signature');
    t.equal(res.statusCode, 401);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
    t.end()
  });
});

test('Test 4: pass valid JSON object and valid signature', function(t) {
  var payload = JSON.stringify({ repository: { full_name: 'repo' } });
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function(data) {
    t.equal(data, 'Waiting for script to finish');
    t.equal(res.statusCode, 200);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
    t.end()
  });
});

test('Test 5: pass custom branch name', function(t) {
  var payload = JSON.stringify({ repository: { full_name: 'repo' } });
  options.path = '/dev/';
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function(data) {
    t.equal(data, 'Waiting for script to finish');
    t.equal(res.statusCode, 200);
    t.deepEqual(res.headers, {'Content-Type': 'text/plain'});
    t.end()
  });
});
