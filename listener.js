var url = require('url'),
    exec = require('child_process').exec,
    crypto = require('crypto'),
    bl = require('bl');

require('string-format');


// Verify payload signature
function verify_payload(signature, secret, payload) {
  var hash = 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
  return signature === hash;
}


var Listener = function (config, logs) {
  this.config = config;
  this.timestamp = new Date();
  this.running = false;
  this.last_payload = {};
  this.script_out = '';
  this.status = 'Ready';

  this.hook = function (req, res) {
    // Get payload
    var self = this;
    req.pipe(bl(function (err, data) {
      if (err) {
        self.status = 'Error';
        self.respond(res, 400, 'Error whilst receiving payload');
        return false;
      }

      self.run_when_ready(function () {
        self.running = true;

        try {
          self.last_payload = JSON.parse(data);
        } catch (e) {
          self.status = 'Error';
          self.running = false;
          self.respond(res, 400, 'Error: Invalid payload');
          return false;
        }

        self.log(new Date(), req.method, req.url);
        self.log(JSON.stringify(self.last_payload, null, '\t') + '\n');

        // Verify payload signature
        var signature = req.headers['x-hub-signature'];
        if (!(signature && verify_payload(signature, self.config.secret, data))) {
          self.status = 'Error';
          self.running = false;
          self.respond(res, 403, 'Error: Cannot verify payload signature');
          return false;
        }

        // Check we have the information we need
        if (!(self.last_payload.repository &&
            self.last_payload.repository.full_name &&
            self.last_payload.ref)) {
          self.status = 'Error';
          self.running = false;
          self.respond(res, 400, 'Error: Invalid data');
          return false;
        }

        // Check branch in payload matches branch in URL
        var branch = url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';
        if (self.last_payload.ref.replace(/^refs\/heads\//, '') != branch) {
          self.status = 'Ready';
          self.running = false;
          self.respond(res, 202, 'Branches do not match', true);
          return false;
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
        })(self.last_payload.repository.full_name, branch);
        self.build(res);
      });
    }));
  };

  this.build = function (res) {
    this.respond(res, 200, 'Nothing to build');
  };

  this.getter = function (repo, branch, cb) {
    var command = this.config.getter.format({
      repo_dir: this.config.repo_dir,
      output: this.config.processing,
      repo: repo,
      branch: branch
    });
    this.log(command);
    exec(command, function(error, stdout, stderr) {
      cb(stdout + stderr);
    });
  };

  this.post_receive = function (repo, cb) {
    var command = this.config.post_receive.format(
        {dir: this.config.processing, repo: repo});
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
