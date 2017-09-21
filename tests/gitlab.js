var test = require('tape'),
    common = require('./common')();


var options = common.options;
var request = common.request;

function createPayload() {
  return {
    repository: {
      git_ssh_url: 'git@github.com:example/repo.git',
      homepage: 'http://github.com/example/repo'
    },
    ref: 'refs/heads/master',
    total_commits_count: 1,
    commits: [{
      message: 'Example commit'
    }]
  };
}


test('BEGIN GITLAB PAYLOAD TESTS', function (t) { t.end(); });

test('pass invalid payload', function (t) {

  t.test('pass string as payload', function (st) {
    var payload = 'asdf';

    request(payload, function (res, data) {
      st.equal(data.err, 'Error: Invalid payload', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  test('pass invalid JSON object: missing repository', function (t) {
    var payload = createPayload();
    payload.repository = undefined;

    request(JSON.stringify(payload), function (res, data) {
      t.equal(data.err, 'Error: Invalid data', 'correct server response');
      t.equal(res.statusCode, 400, 'correct status code');
      t.end();
    });
  });

  test('pass invalid JSON object: missing ref', function (t) {
    var payload = createPayload();
    payload.ref = undefined;

    request(JSON.stringify(payload), function (res, data) {
      t.equal(data.err, 'Error: Invalid data', 'correct server response');
      t.equal(res.statusCode, 400, 'correct status code');
      t.end();
    });
  });

  test('pass invalid JSON object: missing commits', function (t) {
    var payload = createPayload();
    payload.commits = undefined;

    request(JSON.stringify(payload), function (res, data) {
      t.equal(data.err, 'Error: Invalid data', 'correct server response');
      t.equal(res.statusCode, 400, 'correct status code');
      t.end();
    });
  });

});

test('pass valid payload and valid signature', function (t) {

  t.test('valid data but mismatching branch', function (st) {
    var payload = createPayload();
    payload.ref = 'refs/heads/branch';

    request(JSON.stringify(payload), function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('valid data and matching branch', function (st) {
    var payload = createPayload();

    request(JSON.stringify(payload), function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});

test('pass custom branch name', function (t) {

  t.test('mismatching branch in path and branch in payload', function (st) {
    var payload = createPayload();
    options.query.branch = 'dev';

    request(JSON.stringify(payload), function (res, data) {
      st.equal(data.err, 'Branches do not match', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');
      st.end();
    });
  });

  t.test('matching branch in path and branch in payload', function (st) {
    var payload = createPayload();
    payload.ref = 'refs/heads/dev';
    options.query.branch = 'dev';

    request(JSON.stringify(payload), function (res, data) {
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.end();
    });
  });

});
