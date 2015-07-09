var url = require('url');
var exec = require('child_process').exec;
var bl = require('bl');
var logging = require('logging-tool');
var format = require('string-format');
var parser = require('./parser');

format.extend(String.prototype);


var Listener = function(config, logs) {
  var self = this;

  logging.silent = !logs;

  self.logging = logs;
  self.config = config;
  self.timestamp = new Date();
  self.waiting = [];
  self.running = false;
  self.lastPayload = {};
  self.data = {};
  self.scriptOut = '';
  self.status = 'Ready';
};

Listener.prototype.error = function(res, code, message, hide) {
  var self = this;

  logging.warn(message);
  self.status = 'Error';
  self.respond(res, code, message, hide);

};

Listener.prototype.hook = function(req, res) {
  var self = this;

  // Get payload
  req.pipe(bl(function(err, data) {
    if (err) {
      return self.error(res, 400, 'Error whilst receiving payload');
    }

    self.queue((function(req, res) {
      return function() {

        self.parser = req.headers['travis-repo-slug'] ?
          new parser.Travis(data, req.headers, self.config) :
          new parser.GitHub(data, req.headers, self.config);

        self.lastPayload = self.parser.parseBody();
        if (!self.lastPayload) {
          return self.error(res, 400, 'Error: Invalid payload');
        }

        logging.log(new Date(), req.method, req.url);
        logging.log(JSON.stringify(self.lastPayload, null, '\t') + '\n');

        // Verify payload signature
        if (!self.parser.verifySignature()) {
          return self.error(res, 403, 'Error: Cannot verify payload signature');
        }

        // Check we have the information we need
        self.data = self.parser.extract();
        if (!self.data) {
          return self.error(res, 400, 'Error: Invalid data');
        }

        // Check branch in payload matches branch in URL
        var repo = self.data.slug;
        var branch = url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';
        if (self.data.branch !== branch) {
          return self.error(res, 202, 'Branches do not match', true);
        }

        self.build = (function(repo, branch) {
          return function(res) {
            // Run script
            self.status = 'Waiting';
            self.respond(res, 200, 'Waiting for script to finish');

            var out = '';
            self.getter(repo, branch, function(getterOut) {
              out += getterOut;
              self.postReceive(repo, function(postReceiveOut) {
                out += postReceiveOut;
                logging.log('\n' + out);
                logging.info('Finished processing files\n');

                self.scriptOut = out;
                self.status = 'Done';
                self.timestamp = new Date();
                process.emit('refresh');

                self.nextInQueue();
              });
            });
          };
        })(repo, branch); // End build closure
        self.build(res);

      };
    })(req, res)); // End queue closure

  }));
};

Listener.prototype.rerun = function(res) {
  var self = this;

  if (self.build) {
    self.queue(function() {
      self.build(res);
    });
  } else {
    self.respond(res, 200, 'Nothing to build');
  }
};

Listener.prototype.getter = function(repo, branch, cb) {
  var self = this;

  var command = self.config.getter.format({
    repoDir: self.config.repo_dir,
    output: self.config.processing,
    repo: repo,
    branch: branch,
  });

  logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

Listener.prototype.postReceive = function(repo, cb) {
  var self = this;

  var command = self.config.post_receive.format({
    dir: self.config.processing,
    name: repo,
  });

  logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

Listener.prototype.queue = function(func) {
  var self = this;

  // Avoids running multiple requests at once.
  if (self.waiting.length || self.running) {
    logging.info('Script already running');
    self.waiting.push(func);
  } else {
    self.running = true;
    func();
  }
};

Listener.prototype.nextInQueue = function() {
  var self = this;

  self.running = false;

  if (self.waiting.length) {
    // Pop and run next in queue
    self.waiting.splice(0, 1)[0]();
  }
};

Listener.prototype.respond = function(res, httpCode, message, notRefresh) {
  var self = this;

  if (notRefresh === undefined) {
    self.scriptOut = message;
    process.emit('refresh');
  }

  res.writeHead(httpCode, {'Content-Type': 'text/plain'});
  res.end(message);
};


module.exports = Listener;
