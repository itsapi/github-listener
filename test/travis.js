var test = require('tape'),
    qs = require('querystring'),
    common = require('./common')();


var options = common.options;
var config = common.config;
var request = common.request;
var gen_sig = common.travis_sig;


test('BEGIN TRAVIS PAYLOAD TESTS', function (t) { t.end(); });

test('pass string as payload', function (t) {

  var payload = 'asdf';
  options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
  options.headers['travis-repo-slug'] = 'repo';

  request(payload, function (res, data) {
    t.equal(data, 'Error: Invalid payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass invalid data in payload', function (t) {

  var payload = qs.stringify({ payload: JSON.stringify({}) });
  options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
  options.headers['travis-repo-slug'] = 'repo';

  request(payload, function (res, data) {
    t.equal(data, 'Error: Invalid data', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass valid payload but invalid signature', function (t) {

  t.test('valid secret but invalid slug', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'invalid');
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      t.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      t.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('valid payload but invalid secret', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['authorization'] = gen_sig('notasecret', 'repo');
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('no travis-repo-slug header provided', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('no authorization header provided', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});

test('pass valid payload and valid signature', function (t) {

  t.test('valid data but mismatching branch', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'branch' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('valid data and matching branch', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});

test('pass custom branch name', function (t) {

  t.test('mismatching branch in path and branch in payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';
    options.path = '/dev';

    request(payload, function (res, data) {
      st.equal(data, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('matching branch in path and branch in payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'dev' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';
    options.path = '/dev';

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

  t.test('trailing slash in path', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'dev' }) });
    options.headers['authorization'] = gen_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';
    options.path = '/dev/';

    request(payload, function (res, data) {
      st.equal(data, 'Waiting for script to finish', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });
  });

});
