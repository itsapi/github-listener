var url = require('url'),
    exec = require('child_process').exec,
    bl = require('bl'),
    logging = require('logging-tool'),
    format = require('string-format'),
    parser = require('./parser');

format.extend(String.prototype);


/**
 * Creates a new `Listener` instance.
 * @name Listener
 * @function
 * @param {Object} config The GHL `config.json` (see example)
 * @param {Boolean} logs Output logs if `true`
 */

var Listener = function (config, logs) {
  var self = this;

  logging.silent = !logs;

  self.logging = logs;
  self.config = config;
  self.timestamp = new Date();
  self.waiting = [];
  self.running = false;
  self.last_payload = {};
  self.data = {};
  self.script_out = '';
  self.status = 'Ready';
};

/**
 * Handles error responses
 * @name Listener.error
 * @function
 * @param {Object} res The HTTP response object
 * @param {Number} code The HTTP response code
 * @param {String} message The error message to be used
 * @param {Boolean} hide Don't update client side if `true`
 */

Listener.prototype.error = function (res, code, message, hide) {
  var self = this;

  logging.warn(message);
  self.status = 'Error';
  self.respond(res, code, message, hide);

  return true;
};

/**
 * Handle a payload request
 * @name Listener.hook
 * @function
 * @param {Object} req The HTTP request object
 * @param {Object} res The HTTP response object
 */

Listener.prototype.hook = function (req, res) {
  var self = this;

  // Get payload
  req.pipe(bl(function (err, data) {
    if (err) {
      return self.error(res, 400, 'Error whilst receiving payload');
    }

    self.queue((function (req, res) {
      return function () {

        self.parser = req.headers['travis-repo-slug'] ?
          new parser.Travis(data, req.headers, self.config) :
          new parser.GitHub(data, req.headers, self.config);

        self.last_payload = self.parser.parse_body();

        var out = self.check_payload(req, res);
        if (out.err) { return; }

        self.gen_build(out.repo, out.branch);
        self.build(res);
      };
    })(req, res)); // End queue closure

  }));
};

/**
 * Ensure payload object is valid
 * @name Listener.check_payload
 * @function
 * @param {Object} req The HTTP request object
 * @param {Object} res The HTTP response object
 */

Listener.prototype.check_payload = function (req, res) {
  var self = this;

  if (!self.last_payload) {
    return {err: self.error(res, 400, 'Error: Invalid payload')};
  }

  logging.log(new Date(), req.method, req.url);
  logging.log(JSON.stringify(self.last_payload, null, '\t') + '\n');

  // Verify payload signature
  if (!self.parser.verify_signature()) {
    return {err: self.error(res, 403, 'Error: Cannot verify payload signature')};
  }

  // Check we have the information we need
  self.data = self.parser.extract();
  if (!self.data) {
    return {err: self.error(res, 400, 'Error: Invalid data')};
  }

  function get_branch (req) {
    return url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';
  }

  // Check branch in payload matches branch in URL
  if (self.data.branch !== get_branch(req)) {
    return {err: self.error(res, 202, 'Branches do not match', true)};
  }

  return {repo: self.data.slug, branch: self.data.branch};
};

/**
 * Create `self.build` function that can be rerun
 * @name Listener.gen_build
 * @function
 * @param {String} repo The name of the repo to be passed into `self.getter`
 * @param {String} branch The name of the branch to be passed into `self.getter`
 */

Listener.prototype.gen_build = function (repo, branch) {
  var self = this;

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
          logging.log('\n' + out);
          logging.info('Finished processing files\n');

          self.script_out = out;
          self.status = 'Done';
          self.timestamp = new Date();
          process.emit('refresh');

          self.next_in_queue();
        });
      });

    };
  })(repo, branch); // End build closure
};

/**
 * Run `self.build` if it is defined
 * @name Listener.rerun
 * @function
 * @param {Object} res The HTTP response object
 */

Listener.prototype.rerun = function (res) {
  var self = this;

  if (self.build) {
    self.queue(function () {
      self.build(res);
    });
  } else {
    self.respond(res, 200, 'Nothing to build');
  }
};

/**
 * Run github-getter to get the repo from GitHub
 * @name Listener.getter
 * @function
 * @param {String} repo The repo to get from GitHub
 * @param {String} branch The branch to checkout
 * @param {Function} cb The callback to be run with the command output
 */

Listener.prototype.getter = function (repo, branch, cb) {
  var self = this;

  var command = self.config.getter.format({
    repo_dir: self.config.repo_dir,
    output: self.config.processing,
    repo: repo,
    branch: branch
  });

  logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

/**
 * Run the build scripts for the repo
 * @name Listener.post_receive
 * @function
 * @param {String} repo The repo name to be passed to post-receive
 * @param {Function} cb The callback to be run with the command output
 */

Listener.prototype.post_receive = function (repo, cb) {
  var self = this;

  var command = self.config.post_receive.format({
    dir: self.config.processing,
    name: repo
  });

  logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

/**
 * Queue a function to be run
 * @name Listener.queue
 * @function
 * @param {Function} func The function to be queued
 */

Listener.prototype.queue = function (func) {
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

/**
 * Run the next function in the queue
 * @name Listener.next_in_queue
 * @function
 */

Listener.prototype.next_in_queue = function () {
  var self = this;

  self.running = false;

  if (self.waiting.length) {
    // Pop and run next in queue
    self.waiting.splice(0, 1)[0]();
  }
};

/**
 * Respond to an HTTP request
 * @name Listener.respond
 * @function
 * @param {Object} res The HTTP response object
 * @param {Number} http_code The HTTP response code
 * @param {String} message The message to be sent
 * @param {Boolean} not_refresh Don't update client side if `true`
 */

Listener.prototype.respond = function (res, http_code, message, not_refresh) {
  var self = this;

  if (not_refresh === undefined) {
    self.script_out = message;
    process.emit('refresh');
  }

  res.writeHead(http_code, {'Content-Type': 'text/plain'});
  res.end(message);
};


module.exports = Listener;
