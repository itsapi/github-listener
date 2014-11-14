var http = require('http'),
    crypto = require('crypto'),
    fs = require('fs'),
    async = require('async');

var options = {
  host: 'localhost',
  path: '/',
  port: '6003',
  method: 'POST',
  headers: {}
};
var payload = {};


// Make request and log response
function make_req(options, payload, cb) {
  var req = http.request(options, function(res) {
    var str = '';
    res.on('data', function (chunk) {
      str += chunk;
    });
    res.on('end', function () {
      console.log(str + '\n');
      cb();
    });
  });

  req.write(payload);
  req.end();
}


// Load the secret from the file
var SECRET = fs.readFileSync(__dirname + '/secret.txt').toString().replace(/\s/g,'');


// Generate payload signature
function gen_payload_sig(secret, payload) {
  return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
}


/**** START TESTS ****/


async.series([
  function(cb) {
    console.log('Test 1: pass invalid JSON object');
    payload = JSON.stringify({ property: 'false' });
    options.headers['x-hub-signature'] = gen_payload_sig(SECRET, payload);
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 2: pass valid JSON object but invalid signature');
    payload = JSON.stringify({ repository: { full_name: 'repo' } });
    options.headers['x-hub-signature'] = gen_payload_sig(SECRET, 'bogus');
    make_req(options, payload, cb);
  },
  function(cb) {
    console.log('Test 3: pass valid JSON object and valid signature');
    payload = JSON.stringify({ repository: { full_name: 'repo' } });
    options.headers['x-hub-signature'] = gen_payload_sig(SECRET, payload);
    make_req(options, payload, cb);
  }
])
