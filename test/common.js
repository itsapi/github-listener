var through2 = require('through2')
,   Listener = require('../listener');


function data () {
  var self = this;
  var res = {
    writeHead: function (statusCode, headers) {
      res.statusCode = statusCode;
      res.headers = headers;
    }
  };

  this.request = function (payload, cb) {
    var listener = new Listener(self.config);
    var req = through2();

    res.end = function (data) { cb(res, data) };

    req.method = self.options.method;
    req.url = self.options.path;
    req.headers = self.options.headers;

    listener.hook(req, res);
    req.end(payload);
  };

  this.config =
  { processing: "/home/git/deploy/processing"
  , repo_dir: "/home/git/deploy/repos"
  , getter: "/home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}"
  , post_receive: "python3 /home/git/deploy/post-receive/main.py {dir}"
  , secret: '1337'
  , travis_token: 'topsecret'
  };

  this.options =
  { host: 'localhost'
  , path: '/'
  , port: '6003'
  , method: 'POST'
  , headers: {}
  };
}

module.exports = function () { return new data(); }
