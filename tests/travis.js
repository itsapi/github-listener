var test = require('tape'),
    qs = require('querystring'),
    common = require('./common')();


var options = common.options;
var request = common.request;
var gen_sig = common.travis_sig;


test('BEGIN TRAVIS PAYLOAD TESTS', function (t) { t.end(); });

test('pass string as payload', function (t) {

  var payload = 'asdf';
  options.headers['signature'] = gen_sig(payload);
  options.headers['travis-repo-slug'] = 'repo';

  request(payload, function (res, data) {
    t.equal(data.err, 'Error: Invalid payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass invalid data in payload', function (t) {

  var payload = qs.stringify({ payload: JSON.stringify({}) });
  options.headers['signature'] = gen_sig(payload);
  options.headers['travis-repo-slug'] = 'repo';

  request(payload, function (res, data) {
    t.equal(data.err, 'Error: Invalid data', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass valid payload but invalid signature', function (t) {

  t.test('valid payload but invalid secret', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['signature'] = gen_sig('bogus');
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('no travis-repo-slug header provided', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['signature'] = gen_sig(payload);
    options.headers['travis-repo-slug'] = null;

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Invalid payload', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('no signature header provided', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['signature'] = null;
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});

test('pass valid payload and valid signature', function (t) {

  t.test('valid data but mismatching branch', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'branch' }) });
    options.headers['signature'] = gen_sig(payload);
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('valid data and matching branch', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['signature'] = gen_sig(payload);
    options.headers['travis-repo-slug'] = 'repo';

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});

test('pass custom branch name', function (t) {

  t.test('mismatching branch in path and branch in payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'master' }) });
    options.headers['signature'] = gen_sig(payload);
    options.headers['travis-repo-slug'] = 'repo';
    options.query.branch = 'dev';

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('matching branch in path and branch in payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({ branch: 'dev' }) });
    options.headers['signature'] = gen_sig(payload);
    options.headers['travis-repo-slug'] = 'repo';
    options.query.branch = 'dev';

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});
