var url = require('url'),
    exec = require('child_process').exec,
    events = new (require('events').EventEmitter)(),
    crypto = require('crypto'),
    bl = require('bl');

require('string-format');


// Verify payload signature
function verify_payload(signature, secret, payload) {
  var hash = 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
  return signature == hash;
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
        self.respond(res, 400, 'Error whilst receiving payload');
        self.status = 'Error';
        return false;
      }

      self.run_when_ready(function () {
        self.running = true;

        try {
          self.last_payload = JSON.parse(data);
        } catch (e) {
          self.respond(res, 400, 'Error: Invalid payload');
          self.status = 'Error';
          self.running = false;
          return false;
        }

        self.log(new Date(), req.method, req.url);
        self.log(JSON.stringify(self.last_payload, null, '\t') + '\n');

        // Verify payload signature
        signature = req.headers['x-hub-signature'];
        if (!(signature && verify_payload(signature, self.config.secret, data))) {
          self.respond(res, 401, 'Error: Cannot verify payload signature');
          self.status = 'Error';
          self.running = false;
          return false;
        }

        // Check we have the information we need
        if (!(self.last_payload.repository && self.last_payload.repository.full_name)) {
          self.respond(res, 400, 'Error: Invalid data');
          self.status = 'Error';
          self.running = false;
          return false;
        }

        // Run script
        self.respond(res, 200, 'Waiting for script to finish');
        self.status = 'Waiting';

        branch = url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';

        var out = ''
        self.getter(self.last_payload.repository.full_name, branch, function (getter_out) {
          out += getter_out;
          self.post_receive(function (post_receive_out) {
            out += post_receive_out;
            self.log('\n' + out);
            self.log('Finished processing files\n');

            self.script_out = out;
            self.status = 'Done';
            self.running = false;
            self.timestamp = new Date();
            events.emit('refresh');
          });
        });
      });
    }));
  }

  this.getter = function (repo, branch, cb) {
    var command = this.config.getter.format({
      repo_dir: this.config.repo_dir,
      output: this.config.processing,
      repo: repo,
      branch: branch
    });
    this.log(command)
    exec(command, function(error, stdout, stderr) {
      cb(stdout + stderr);
    });
  }

  this.post_receive = function(cb) {
    var command = this.config.post_receive.format({dir: this.config.processing});
    this.log(command)
    exec(command, function(error, stdout, stderr) {
      cb(stdout + stderr);
    });
  }

  this.run_when_ready = function(func) {
    // Avoids running multiple requests at once.
    if (this.running) this.log('Script already running');
    function wait() {
      if (this.running) setTimeout(wait, 100);
      else func();
    }
    wait();
  }

  this.respond = function(res, http_code, message) {
    this.log(message);

    this.script_out = message;
    events.emit('refresh');

    res.writeHead(http_code, {'Content-Type': 'text/plain'});
    res.end(message);
  }

  this.log = function(msg) {
    if (logs) console.log(msg);
  }
};


module.exports = Listener;
