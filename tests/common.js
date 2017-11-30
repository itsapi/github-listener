var through2 = require('through2'),
    crypto = require('crypto'),
    BuildManager = require('../src/build-manager');


function data () {
  var self = this;
  var res = {
    writeHead: function (statusCode, headers) {
      res.statusCode = statusCode;
      res.headers = headers;
    }
  };

  this.request = function (payload, cb) {
    var build_manager = new BuildManager(self.config);
    var req = through2();

    res.end = function (data) { cb(res, JSON.parse(data)); };

    req.method = self.options.method;
    req.url = self.options.path;
    req.headers = self.options.headers;
    req.query = self.options.query;

    build_manager.hook(req, res);
    req.end(payload);

    return build_manager;
  };

  this.github_sig = function (secret, payload) {
    return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
  };

  this.travis_sig = function (payload) {
    var private_key = '-----BEGIN RSA PRIVATE KEY-----\nMIIBOQIBAAJBAI5g7QAWN86efJNTdsmIdd5ry0OwvJ5j28JqoOJfwaXwpvW/1IgK\nu1C4AfXHm0Ci3mn4Q1ta0RX0hhmQEoGyH98CAwEAAQJAGQd/AnHlc6Q24CtfCYS8\nu9IVVJwAPJPvcRkPmVweDc6fi02y2MA8XWpZc5I4tE5eS/DrqgOhnIeymcClVoMj\n2QIhAP7B3jw8wHC5mQKhW58GUw2aIslvilXq45Dv3q6LeeILAiEAjxK5IN9MONJj\nknltBgPkhc+9fLM8JZJzTUGeY96REf0CIBms1kYB5W829VnTg1VioMo1J55flHSW\nSLsZwbqbqfwDAiBenOgWB/S04tR8CZaCUtKtdqp9K14MDqP3I/ylWIqg1QIgQnRQ\nRQ8yUzhFxVkOp3benrEpxY6E1TYBiwDXkoWS9lY=\n-----END RSA PRIVATE KEY-----';
    return crypto.createSign('sha1').update(payload).sign(private_key, 'base64');
  };

  this.config = {
    processing: '/home/git/deploy/processing',
    repo_dir: '/home/git/deploy/repos',
    getter: '/home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}',
    post_receive: 'python3 /home/git/deploy/post-receive/main.py {dir}',
    github_secret: '1337',
    travis_token: 'topsecret',
    travis_public_key: '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI5g7QAWN86efJNTdsmIdd5ry0OwvJ5j\n28JqoOJfwaXwpvW/1IgKu1C4AfXHm0Ci3mn4Q1ta0RX0hhmQEoGyH98CAwEAAQ==\n-----END PUBLIC KEY-----'
  };

  this.options = {
    host: 'localhost',
    path: '/',
    port: '6003',
    method: 'POST',
    headers: {},
    query: {}
  };
}

module.exports = function () { return new data(); };
