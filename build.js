var url = require('url'),
    exec = require('child_process').exec,
    parser = require('./parser');

/**
 * Create `self.build` function that can be rerun
 * @name build.gen_build
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
  self.parser = req.headers['travis-repo-slug'] ?
    new parser.Travis(payload, req.headers, self.build_manager.config) :
    new parser.GitHub(payload, req.headers, self.build_manager.config);

  self.ui.payload = self.parser.parse_body();
};

/**
 * Ensure payload object is valid
 * @name build.check_payload
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
    self.build_manager.error(self.res, code, message);
    process.emit('refresh', self.id);
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
    return error(400, 'Error: Invalid data');
  }

  // Check branch in payload matches branch in URL
  var branch = url.parse(self.req.url).pathname.replace(/^\/|\/$/g, '') || 'master';
  if (self.ui.data.branch !== branch) {
    return error(400, 'Branches do not match');
  }

  self.build_manager.respond(self.res, 202, 'Build queued');
  self.ui.log += 'Build queued\n';
  process.emit('refresh', self.id);
};

/**
 * Run the stored self.build
 * @name build.run
 * @function
 */

Build.prototype.run = function () {
  var self = this;

  self.ui.status = self.build_manager.STATUS.RUNNING;
  self.ui.log += 'Build started\n';
  process.emit('refresh', self.id);

  // Run script
  var out = '';
  self.getter(self.ui.data.repo, self.ui.data.branch, function (getter_out) {
    out += getter_out;
    self.post_receive(self.ui.data.repo, function (post_receive_out) {
      out += post_receive_out;
      self.build_manager.logging.log('\n' + out);
      self.build_manager.logging.info('Finished processing files\n');

      self.ui.status = self.build_manager.STATUS.DONE;
      self.ui.log += out + '\nBuild Finished';

      self.build_manager.next_in_queue();
      process.emit('refresh', self.id);
    });
  });
};

/**
 * Run github-getter to get the repo from GitHub
 * @name Build.getter
 * @function
 * @param {String} repo The repo to get from GitHub
 * @param {String} branch The branch to checkout
 * @param {Function} cb The callback to be run with the command output
 */

Build.prototype.getter = function (repo, branch, cb) {
  var self = this;

  var command = self.build_manager.config.getter.format({
    repo_dir: self.build_manager.config.repo_dir,
    output: self.build_manager.config.processing,
    repo: repo,
    branch: branch
  });

  self.build_manager.logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

/**
 * Run the build scripts for the repo
 * @name Build.post_receive
 * @function
 * @param {String} repo The repo name to be passed to post-receive
 * @param {Function} cb The callback to be run with the command output
 */

Build.prototype.post_receive = function (repo, cb) {
  var self = this;

  var command = self.build_manager.config.post_receive.format({
    dir: self.build_manager.config.processing,
    name: repo
  });

  self.build_manager.logging.log(command);
  exec(command, function(error, stdout, stderr) {
    cb(stdout + stderr);
  });
};

module.exports = Build;
