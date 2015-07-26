var through2 = require('through2'),
    crypto = require('crypto'),
    BuildManager = require('../build-manager');


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

    res.end = function (data) { cb(res, data); };

    req.method = self.options.method;
    req.url = self.options.path;
    req.headers = self.options.headers;

    build_manager.hook(req, res);
    req.end(payload);

    return build_manager;
  };

  this.github_sig = function (secret, payload) {
    return 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
  };

  this.travis_sig = function (secret, slug) {
    return crypto.createHash('sha256').update(slug + secret).digest('hex');
  };

  this.config = {
    processing: '/home/git/deploy/processing',
    repo_dir: '/home/git/deploy/repos',
    getter: '/home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}',
    post_receive: 'python3 /home/git/deploy/post-receive/main.py {dir}',
    github_secret: '1337',
    travis_token: 'topsecret'
  };

  this.options = {
    host: 'localhost',
    path: '/',
    port: '6003',
    method: 'POST',
    headers: {}
  };
}

module.exports = function () { return new data(); };
