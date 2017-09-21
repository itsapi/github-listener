var test = require('tape'),
    common = require('./common')();


var options = common.options;
var config = common.config;
var request = common.request;
var gen_sig = common.github_sig;


test('BEGIN GITHUB PAYLOAD TESTS', function (t) { t.end(); });

test('pass string as payload', function (t) {

  var payload = 'asdf';
  options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

  request(payload, function (res, data) {
    t.equal(data.err, 'Error: Invalid payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass invalid JSON object', function (t) {

  var payload = JSON.stringify({ property: 'false' });
  options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

  request(payload, function (res, data) {
    t.equal(data.err, 'Error: Invalid data', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

});

test('pass valid JSON object but invalid signature', function (t) {

  t.test('valid secret but invalid payload', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, 'asdf'), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('valid payload but invalid secret', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers = {'x-hub-signature': gen_sig('asdf', payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});

test('pass valid JSON object and valid signature', function (t) {

  t.test('valid data but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('valid data and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});

test('pass custom branch name', function (t) {

  t.test('valid branch in path but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs' });
    options.query = {branch: 'dev'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('valid branch in path and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/dev' });
    options.query = {branch: 'dev'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});

test('pass semver flag', function (t) {

  t.test('semver flag passed but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {semver: true};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('semver flag passed and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/v1.2.3' });
    options.query = {semver: true};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('semver flag and branch name passed and valid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/v1.2.3' });
    options.query = {semver: true, branch: 'master'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('semver flag and branch name passed and valid branch ref but not semver', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {semver: true, branch: 'master'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('semver flag and branch name passed but invalid branch ref', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {semver: true, branch: 'dev'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

});

test('pass url_secret', function (t) {

  t.test('pass url_secret in query string but not in config', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {secret: 'password123'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('pass same url_secret in query string as in config', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {secret: 'password123'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};
    config.url_secret = 'password123';

    request(payload, function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

  t.test('url_secret in config but not in query string', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};
    config.url_secret = 'password123';

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

  t.test('different url_secret in query string than in config', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.query = {secret: 'bogus'};
    options.headers = {'x-hub-signature': gen_sig(config.github_secret, payload), 'x-github-delivery': 1};
    config.url_secret = 'password123';

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Cannot verify payload signature', 'correct server response');
      st.equal(res.statusCode, 403, 'correct status code');
      st.end();
    });
  });

});
