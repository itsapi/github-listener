var crypto = require('crypto'),
    test = require('tape'),
    common = require('./common')();


var options = common.options;
var config = common.config;
var request = common.request;


// Generate payload signature
function gen_sig (secret, payload) {
  return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
}


test('BEGIN GITHUB PAYLOAD TESTS', function (t) { t.end(); });

test('pass string as payload', function (t) {

  var payload = 'asdf';
  options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

  request(payload, function (res, data) {
    t.equal(data, 'Error: Invalid payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass invalid JSON object', function (t) {

  var payload = JSON.stringify({ property: 'false' });
  options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

  request(payload, function (res, data) {
    t.equal(data, 'Error: Invalid data', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass valid JSON object but invalid signature', function (t) {

  t.test('valid secret but invalid payload', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_sig(config.secret, 'asdf');

    request(payload, function (res, data) {
      t.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      t.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('valid payload but invalid secret', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_sig('asdf', payload);

    request(payload, function (res, data) {
      st.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});

test('pass valid JSON object and valid signature', function (t) {

  t.test('valid data but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

    request(payload, function (res, data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('valid data and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});

test('pass custom branch name', function (t) {

  t.test('valid branch in path but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.path = '/dev';
    options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

    request(payload, function (res, data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('valid branch in path and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/dev' });
    options.path = '/dev';
    options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

  t.test('trailing slash in path', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/dev' });
    options.path = '/dev/';
    options.headers['x-hub-signature'] = gen_sig(config.secret, payload);

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});
