var http = require('http'),
    crypto = require('crypto'),
    config = require('./config');

var payload = JSON.stringify({
  repository: { full_name: 'repo', url: 'http://example.com' },
  ref: 'refs/heads/master',
  head_commit: { message: 'example commit' }
});

var options = {
  hostname: 'localhost',
  port: 6003,
  path: '/',
  method: 'POST',
  headers: {
    'x-hub-signature': gen_payload_sig(config.travis_token, payload)
  }
};

function gen_payload_sig(token, slug) {
  return crypto.createHash('sha256').update(slug + token).digest('hex');
}

http.request(options, function (res) {
  res.on('data', function (data) {
    console.log(data.toString());
  });
}).end(payload);
