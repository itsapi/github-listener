var crypto = require('crypto')
,   test = require('tape')
,   through2 = require('through2')
,   Listener = require('./listener');


var config =
{ processing: "/home/git/deploy/processing"
, repo_dir: "/home/git/deploy/repos"
, getter: "/home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}"
, post_receive: "python3 /home/git/deploy/post-receive/main.py {dir}"
, secret: '1337'
};

var options =
{ host: 'localhost'
, path: '/'
, port: '6003'
, method: 'POST'
, headers: {}
};

var res = {
  writeHead: function (statusCode, headers) {
    res.statusCode = statusCode;
    res.headers = headers;
  }
}


// Make request and log response
function make_req(options, payload, cb) {
  var listener = new Listener(config);
  var req = through2();

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


test('Test 1: pass string as payload', function (t) {

  var payload = 'asdf';
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function (data) {
    t.equal(data, 'Error: Invalid payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('Test 2: pass invalid JSON object', function (t) {

  var payload = JSON.stringify({ property: 'false' });
  options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

  make_req(options, payload, function (data) {
    t.equal(data, 'Error: Invalid data', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('Test 3: pass valid JSON object but invalid signature', function (t) {

  t.test('3.1: valid secret but invalid payload', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, 'asdf');

    make_req(options, payload, function (data) {
      t.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      t.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('3.2: valid payload but invalid secret', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_payload_sig('asdf', payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});

test('Test 4: pass valid JSON object and valid signature', function (t) {

  t.test('4.1: valid data but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('4.2: valid data and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});

test('Test 5: pass custom branch name', function (t) {

  t.test('5.1: valid branch in path but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.path = '/dev';
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('5.2: valid branch in path and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/dev' });
    options.path = '/dev';
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

  t.test('5.3: trailing slash in path', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/dev' });
    options.path = '/dev/';
    options.headers['x-hub-signature'] = gen_payload_sig(config.secret, payload);

    make_req(options, payload, function (data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});
