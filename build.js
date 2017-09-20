var semver = require('semver'),
    exec = require('child_process').exec,
    parser = require('./parser');

/**
 * Create `self.build` function that can be rerun
 * @name Build.gen_build
 * @function
 * @param {String} repo The name of the repo to be passed into `self.getter`
 * @param {String} branch The name of the branch to be passed into `self.getter`
 */

var Build = function (req, res, payload, build_manager, id) {
  var self = this;

  self.req = req;
  self.res = res;
  self.build_manager = build_manager;
  self.id = id;

  self.ui = {
    payload: '',
    log: '',
    data: {},
    timestamp: new Date()
  };

  // Load and check payload
  if (req.headers['travis-repo-slug']) {
    self.parser = new parser.Travis(payload, req.headers, self.build_manager.config);
  } else if (req.headers['x-github-delivery']) {
    self.parser = new parser.GitHub(payload, req.headers, self.build_manager.config);
  } else {
    self.parser = new parser.GitLab(payload, req.headers, self.build_manager.config);
  }

  self.ui.payload = self.parser.parse_body();
};

/**
 * Ensure payload object is valid
 * @name Build.check_payload
 * @function
 * @param {Object} req The HTTP request object
 * @param {Object} res The HTTP response object
 */

Build.prototype.check_payload = function () {
  var self = this;

  function error (code, message) {
    self.err = true;
    self.ui.status = self.build_manager.STATUS.ERROR;
    self.ui.log += message;
    self.build_manager.error(self.res, code, {err: message, id: self.id});
    process.emit('send_update', self.id);
  }

  if (!self.ui.payload) {
    return error(400, 'Error: Invalid payload');
  }

  self.build_manager.logging.log(new Date(), self.req.method, self.req.url);
  self.build_manager.logging.log(JSON.stringify(self.ui.payload, null, '\t') + '\n');

  // Verify payload signature
  if (!self.parser.verify_signature()) {
    return error(403, 'Error: Cannot verify payload signature');
  }

  // Check we have the information we need
  self.ui.data = self.parser.extract();
  if (!self.ui.data) {
    self.ui.data = {};
    return error(400, 'Error: Invalid data');
  }

  // Check branch in payload matches branch in URL
  if (self.req.query.semver === undefined) {
    self.req.query.branch = (self.req.query.branch || 'master');
  }
  if (!semver.valid(self.ui.data.branch) && self.ui.data.branch !== self.req.query.branch) {
    return error(400, 'Branches do not match');
  }

  self.build_manager.respond(self.res, 202, {msg: 'Build queued', id: self.id});
  self.ui.log += 'Build queued\n';
  process.emit('send_update', self.id);
};

/**
 * Run the stored self.build
 * @name Build.run
 * @function
 */

Build.prototype.run = function () {
  var self = this;

  self.ui.status = self.build_manager.STATUS.RUNNING;
  self.ui.log += 'Build started\n';
  process.emit('send_update', self.id);

  // Run script
  self.getter(self.ui.data.slug, self.ui.data.branch, function (getter_exit) {
    self.post_receive(self.ui.data.slug, function (pr_exit) {
      self.build_manager.logging.info('Finished processing files\n');

      self.ui.log += '\nBuild Finished';
      self.ui.status = (getter_exit === 0 && pr_exit === 0) ?
                       self.build_manager.STATUS.DONE :
                       self.build_manager.STATUS.ERROR;

      self.build_manager.next_in_queue();
      process.emit('send_update', self.id);
    });
  });
};

/**
 * Run github-getter to get the repo from GitHub
 * @name Build.getter
 * @function
 * @param {String} repo The repo to get from GitHub
 * @param {String} branch The branch to checkout
 * @param {Function} cb The callback to be run with the command exit code
 */

Build.prototype.getter = function (repo, branch, cb) {
  var self = this;

  var command = self.build_manager.config.getter.format({
    repo_dir: self.build_manager.config.repo_dir,
    output:   self.build_manager.config.processing,
    repo:     repo,
    branch:   branch,
    url:      self.ui.data.get_url
  });

  self.run_command(command, cb);
};

/**
 * Run the build scripts for the repo
 * @name Build.post_receive
 * @function
 * @param {String} repo The repo name to be passed to post-receive
 * @param {Function} cb The callback to be run with the command exit code
 */

Build.prototype.post_receive = function (repo, cb) {
  var self = this;

  var command = self.build_manager.config.post_receive.format({
    dir: self.build_manager.config.processing,
    name: repo
  });

  self.run_command(command, cb);
};

/**
 * Run a command and log the output
 * @name Build.post_receive
 * @function
 * @param {String} command The command to be executed
 * @param {Function} cb The callback to be run with the command exit code
 */

Build.prototype.run_command = function (command, cb) {
  var self = this;

  self.build_manager.logging.log(command);
  self.add_to_log(command + '\n');

  var proc = exec(command);

  proc.stdout.on('data', self.add_to_log.bind(self));
  proc.stderr.on('data', self.add_to_log.bind(self));

  proc.on('exit', function(code) {
    var msg = '{} exited with code {}'.format(command, code);
    self.build_manager.logging.log(msg);
    self.add_to_log(msg + '\n');
    cb(code);
  });
};

/**
 * Add data to build log
 * @name Build.add_to_log
 * @function
 * @param {String} data The data to be appended to the log
 */

Build.prototype.add_to_log = function (data) {
  var self = this;

  self.ui.log += data;
  process.emit('send_update', self.id);
};

module.exports = Build;
