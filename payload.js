var http = require('http'),
    qs = require('querystring'),
    crypto = require('crypto'),
    config = require('./config');


var payload = {};
var options = {
  hostname: 'localhost',
  port: 6003,
  path: '/',
  method: 'POST'
};


if (process.argv[2] === 'travis') {
  var slug = 'user/repo';

  payload = qs.stringify({
    payload: JSON.stringify({
      repository: { url: 'http://example.com' },
      branch: 'master',
      message: 'did some stuff'
    })
  });

  options.headers = {
    'travis-repo-slug': slug,
    'authorization': crypto.createHash('sha256')
                     .update(slug + config.travis_token).digest('hex')
  };

} else {
  payload = JSON.stringify({
    repository: { full_name: 'user/repo', url: 'http://example.com' },
    ref: 'refs/heads/master',
    head_commit: { message: 'example commit' }
  });

  options.headers = {
    'x-hub-signature': 'sha1=' + crypto.createHmac('sha1', config.github_secret)
                                 .update(payload).digest('hex')
  };
}


http.request(options, function (res) {
  res.on('data', function (data) {
    console.log(data.toString());
  });
}).end(payload);
