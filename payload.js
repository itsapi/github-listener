var http = require('http'),
    crypto = require('crypto'),
    config = require('./config');

var payload = JSON.stringify({ repository: { full_name: 'repo' } });
var options = {
  hostname: 'localhost',
  port: 6003,
  path: '/',
  method: 'POST',
  headers: {
    'x-hub-signature': gen_payload_sig(config.secret, payload)
  }
};

function gen_payload_sig(secret, payload) {
  return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
}

var req = http.request(options, function (res) {
  res.on('data', function (data) {
    console.log(data.toString());
  });
}).end(payload);
