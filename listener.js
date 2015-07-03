var url = require('url'),
    exec = require('child_process').exec,
    bl = require('bl'),
    format = require('string-format'),
    parser = require('./parser');

format.extend(String.prototype);


var Listener = function (config, logging) {
  var self = this;

  self.config = config;
  self.logging = logging;
  self.timestamp = new Date();
  self.running = false;
  self.last_payload = {};
  self.data = {};
  self.script_out = '';
  self.status = 'Ready';
};

Listener.prototype.error = function (res, code, message) {
  var self = this;

  self.status = 'Error';
  self.running = false;
  self.respond(res, code, message);
};

Listener.prototype.hook = function (req, res) {
  var self = this;

  // Get payload
  req.pipe(bl(function (err, data) {
    if (err) return self.error(res, 400, 'Error whilst receiving payload');

    self.build = (function (req) {
      return function (res) {
        self.run_when_ready(function () {
          self.running = true;

          self.parser = req.headers['travis-repo-slug'] ?
            new parser.Travis(data, req.headers, self.config) :
            new parser.GitHub(data, req.headers, self.config);

          self.last_payload = self.parser.parse_body();
          if (!self.last_payload) return self.error(res, 400, 'Error: Invalid payload');

          self.log(new Date(), req.method, req.url);
          self.log(JSON.stringify(self.last_payload, null, '\t') + '\n');

          // Verify payload signature
          if (!self.parser.verify_signature())
            return self.error(res, 403, 'Error: Cannot verify payload signature');

          // Check we have the information we need
          self.data = self.parser.extract();
          if (!self.data) return self.error(res, 400, 'Error: Invalid data');

          // Check branch in payload matches branch in URL
          var repo = self.data.slug;
          var branch = url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';
          if (self.data.branch != branch) {
            return self.error(res, 202, 'Branches do not match', true);
          }

          // Run script
          self.status = 'Waiting';
          self.respond(res, 200, 'Waiting for script to finish');

          var out = '';
          self.getter(repo, branch, function (getter_out) {
            out += getter_out;
            self.post_receive(repo, function (post_receive_out) {
              out += post_receive_out;
              self.log('\n' + out);
              self.log('Finished processing files\n');

              self.script_out = out;
              self.status = 'Done';
              self.running = false;
              self.timestamp = new Date();
              process.emit('refresh');
            });
          });
        });
      };
    })(req);

    self.build(res);
  }));
};

Listener.prototype.build = function (res) {
  var self = this;

  self.respond(res, 200, 'Nothing to build');
};

Listener.prototype.getter = function (repo, branch, cb) {
  var self = this;

  var command = self.config.getter.format({
    repo_dir: self.config.repo_dir,
    output: self.config.processing,
    repo: repo,
    branch: branch
  });

  self.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

Listener.prototype.post_receive = function (repo, cb) {
  var self = this;

  var command = self.config.post_receive.format({
    dir: self.config.processing,
    name: repo
  });

  self.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

Listener.prototype.run_when_ready = function (func) {
  var self = this;

  // Avoids running multiple requests at once.
  if (self.running) self.log('Script already running');
  function wait() {
    if (self.running) setTimeout(wait, 100);
    else func();
  }
  wait();
};

Listener.prototype.respond = function (res, http_code, message, not_refresh) {
  var self = this;

  self.log(message);

  if (not_refresh === undefined) {
    self.script_out = message;
    process.emit('refresh');
  }

  res.writeHead(http_code, {'Content-Type': 'text/plain'});
  res.end(message);
};

Listener.prototype.log = function () {
  var self = this;

  if (self.logging) console.log.apply(null, arguments);
};


module.exports = Listener;
