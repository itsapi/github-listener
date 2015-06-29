var url = require('url')
,   exec = require('child_process').exec
,   bl = require('bl')
,   format = require('string-format')
,   parser = require('./parser')
;

format.extend(String.prototype);


var Listener = function (config, logs) {
  this.config = config;
  this.timestamp = new Date();
  this.running = false;
  this.last_payload = {};
  this.data = {};
  this.script_out = '';
  this.status = 'Ready';

  this.error = function (res, code, message) {
    this.status = 'Error';
    this.running = false;
    this.respond(res, code, message);
  };

  this.hook = function (req, res) {
    // Get payload
    var self = this;
    req.pipe(bl(function (err, data) {
      if (err) return self.error(res, 400, 'Error whilst receiving payload');

      self.run_when_ready(function () {
        self.running = true;

        if (req.headers['travis-repo-slug'])
          self.parser = new parser.Travis(data, req.headers, self.config);
        else self.parser = new parser.GitHub(data, req.headers, self.config);

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

        self.build = (function (repo, branch) {
          return function (res) {
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
          };
        })(repo, branch);
        self.build(res);
      });
    }));
  };

  this.build = function (res) {
    this.respond(res, 200, 'Nothing to build');
  };

  this.getter = function (repo, branch, cb) {
    var command = this.config.getter.format(
    { repo_dir: this.config.repo_dir
    , output: this.config.processing
    , repo: repo
    , branch: branch
    });
    this.log(command);
    exec(command, function(error, stdout, stderr) {
      cb(stdout + stderr);
    });
  };

  this.post_receive = function (repo, cb) {
    var command = this.config.post_receive
                  .format({dir: this.config.processing, name: repo});
    this.log(command);
    exec(command, function(error, stdout, stderr) {
      cb(stdout + stderr);
    });
  };

  this.run_when_ready = function (func) {
    // Avoids running multiple requests at once.
    if (this.running) this.log('Script already running');
    function wait() {
      if (this.running) setTimeout(wait, 100);
      else func();
    }
    wait();
  };

  this.respond = function (res, http_code, message, not_refresh) {
    this.log(message);

    if (not_refresh === undefined) {
      this.script_out = message;
      process.emit('refresh');
    }

    res.writeHead(http_code, {'Content-Type': 'text/plain'});
    res.end(message);
  };

  this.log = function (msg) {
    if (logs) console.log(msg);
  };
};


module.exports = Listener;
