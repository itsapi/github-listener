var test = require('tape'),
    qs = require('querystring'),
    through = require('through2'),
    common = require('./common')(),
    BuildManager = require('../build-manager');


var options = common.options;
var config = common.config;
var request = common.request;
var github_sig = common.github_sig;
var travis_sig = common.travis_sig;


function create_res (cb) {
  var res = {
    writeHead: function (code, headers) {
      res.statusCode = code;
      res.headers = headers;
    },
    end: function (data) {
      cb(res, JSON.parse(data));
    }
  };
  return res;
}


test('BEGIN BUILD MANAGER TESTS', function (t) { t.end(); });


test('build_manager.respond', function (t) {

  t.test('status code and message passed in', function (st) {
    var build_manager = new BuildManager();

    var res = create_res(function (res, data) {
      st.equal(data, 'Hello World', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });

    build_manager.respond(res, 200, 'Hello World');
  });

});


test('build_manager.error', function (t) {

  t.test('status code and message passed in', function (st) {
    var build_manager = new BuildManager();

    var res = create_res(function (res, data) {
      st.equal(data.err, 'Error', 'correct server response');
      st.equal(res.statusCode, 500, 'correct status code');
      st.end();
    });

    build_manager.error(res, 500, 'Error');
  });

});


// TODO: build_manager.rerun takes a build ID param
test.skip('build_manager.rerun', function (t) {
  t.test('build_manager.build is not defined', function (st) {
    var build_manager = new BuildManager();

    st.equal(build_manager.build, undefined, 'build_manager has no build property');
    st.end();
  });

  t.test('nothing to build', function (st) {
    var build_manager = new BuildManager();

    var res = create_res(function (res, data) {
      st.equal(data, 'Nothing to build', 'correct server response');
      st.equal(res.statusCode, 200, 'correct status code');
      st.end();
    });

    build_manager.rerun(res);
  });

  t.test('run last build (invalid payload)', function (st) {
    var build_manager = request('asdf', function (res, data) {
      st.equal(data, 'Error: Invalid payload', 'correct server response');
      st.equal(res.statusCode, 400, 'correct status code');

      res = create_res(function (res, data) {
        st.equal(data, 'Nothing to build', 'correct server response');
        st.equal(res.statusCode, 200, 'correct status code');
        st.end();
      });

      build_manager.rerun(res);
    });
  });

  t.test('run last build (valid payload)', function (st) {
    var payload = JSON.stringify({ repository: { full_name: 'repo' }, ref: 'refs/heads/master' });
    options.headers['x-hub-signature'] = github_sig(config.github_secret, payload);

    var build_manager = request(payload, function (res, data) {
      st.equal(data, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');

      res = create_res(function (res, data) {
        st.equal(data, 'Build queued', 'correct server response');
        st.equal(res.statusCode, 202, 'correct status code');
        st.end();
      });

      build_manager.rerun(res);
    });
  });

});


// TODO: build_manager.queue takes a build ID param
test.skip('build_manager.queue', function (t) {
  t.test('no waiting', function (st) {
    var build_manager = new BuildManager(config);
    var start = Date.now();

    st.equal(build_manager.running, false, 'nothing runnning already');
    build_manager.queue(function () {
      var elapsed = Date.now() - start;

      st.ok(elapsed < 100, 'callback run immediately');
      st.end();
      build_manager.next_in_queue();
    });
  });

  t.test('wait in queue', function (st) {
    var build_manager = new BuildManager(config);
    var first_done = false;

    build_manager.queue(function () {
      st.equal(build_manager.running, true, 'process running');

      setTimeout(function () {
        first_done = true;
        build_manager.next_in_queue();
      }, 500);
    });

    build_manager.queue(function () {
      st.equal(first_done, true, 'process finished running');
      st.end();
      build_manager.next_in_queue();
    });
  });

});


test('build_manager.hook bl error', function (t) {
  var build_manager = new BuildManager(config);
  var req = new through();

  var res = create_res(function (res, data) {
    t.equal(data.err, 'Error whilst receiving payload', 'correct server response');
    t.equal(res.statusCode, 400, 'correct status code');
    t.end();
  });

  build_manager.hook(req, res);
  req.emit('error', new Error('BOOM!'));
});


test('build_manager.data', function (t) {

  t.test('github payload - incomplete payload', function (st) {
    var payload = JSON.stringify({
      repository: { full_name: 'repo' },
      ref: 'refs/heads/master'
    });

    options.headers['x-hub-signature'] = github_sig(config.github_secret, payload);

    var build_manager = request(payload, function (res, data) {
      var build = build_manager.builds[data.id];
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.deepEqual(build.ui.data, {
        slug:   'repo',
        branch: 'master',
        url:    undefined,
        commit: undefined,
        image:  undefined
      });
      st.end();
    });
  });

  t.test('github payload - complete payload', function (st) {
    var payload = JSON.stringify({
      repository: { full_name: 'repo', url: 'example.com' },
      head_commit: { message: 'some commit' },
      sender: { avatar_url: 'image.png' },
      ref: 'refs/heads/master'
    });

    options.headers['x-hub-signature'] = github_sig(config.github_secret, payload);

    var build_manager = request(payload, function (res, data) {
      var build = build_manager.builds[data.id];
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.deepEqual(build.ui.data, {
        slug:   'repo',
        branch: 'master',
        url:    'example.com',
        commit: 'some commit',
        image:  'image.png'
      });
      st.end();
    });
  });

  t.test('travis payload - incomplete payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({
      branch: 'master'
    }) });

    options.headers['authorization'] = travis_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';

    var build_manager = request(payload, function (res, data) {
      var build = build_manager.builds[data.id];
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.deepEqual(build.ui.data, {
        slug:   'repo',
        branch: 'master',
        commit: undefined,
        url:    undefined
      });
      st.end();
    });
  });

  t.test('travis payload - complete payload', function (st) {
    var payload = qs.stringify({ payload: JSON.stringify({
      branch: 'master',
      repository: { url: 'example.com' },
      message: 'some commit'
    }) });

    options.headers['authorization'] = travis_sig(config.travis_token, 'repo');
    options.headers['travis-repo-slug'] = 'repo';

    var build_manager = request(payload, function (res, data) {
      var build = build_manager.builds[data.id];
      st.equal(data.msg, 'Build queued', 'correct server response');
      st.equal(res.statusCode, 202, 'correct status code');
      st.deepEqual(build.ui.data, {
        slug:   'repo',
        branch: 'master',
        url:    'example.com',
        commit: 'some commit'
      });
      st.end();
    });
  });

});
