var bl = require('bl'),
    logging = require('logging-tool'),
    format = require('string-format'),
    Build = require('./build');

format.extend(String.prototype);


/**
 * Creates a new `BuildManager` instance.
 * @name BuildManager
 * @function
 * @param {Object} config The GHL `config.json` (see example)
 * @param {Boolean} logs Output logs if `true`
 */

var BuildManager = function (config, logs) {
  var self = this;

  self.logging = logging;
  self.logging.silent = !logs;

  self.config = config;
  self.waiting = [];
  self.done = [];
  self.running = false;

  self.STATUS = {
    READY: 'Ready',
    WAITING: 'Waiting',
    DONE: 'Done',
    ERROR: 'Error'
  };
};

/**
 * Handles error responses
 * @name BuildManager.error
 * @function
 * @param {Object} res The HTTP response object
 * @param {Number} code The HTTP response code
 * @param {String} message The error message to be used
 */

BuildManager.prototype.error = function (res, code, message) {
  var self = this;

  self.logging.warn(message);
  self.respond(res, code, message);

  return true;
};

/**
 * Handle a payload request
 * @name BuildManager.hook
 * @function
 * @param {Object} req The HTTP request object
 * @param {Object} res The HTTP response object
 */

BuildManager.prototype.hook = function (req, res) {
  var self = this;

  // Get payload
  req.pipe(bl(function (err, data) {
    if (err) {
      return self.error(res, 400, 'Error whilst receiving payload');
    }

    var build = new Build(req, res, data, self);
    self.queue(build);

  }));
};

/**
 * Run `self.build` if it is defined
 * @name BuildManager.rerun
 * @function
 * @param {Object} res The HTTP response object
 */

// TODO: Redo this
BuildManager.prototype.rerun = function (res) {
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
 * Queue a build to be run
 * @name BuildManager.queue
 * @function
 * @param {Object} build The build to be queued
 */

BuildManager.prototype.queue = function (build) {
  var self = this;

  if (build.err) {
    self.done.push(build);
    return;
  }

  // Avoids running multiple requests at once.
  if (self.waiting.length || self.running) {
    logging.info('Script already running');
    self.waiting.push(build);
  } else {
    self.running = true;
    self.current = build;
    build.run();
    self.done.push(build);
  }
};

/**
 * Run the next function in the queue
 * @name BuildManager.next_in_queue
 * @function
 */

BuildManager.prototype.next_in_queue = function () {
  var self = this;

  self.running = false;

  if (self.waiting.length) {
    // Pop and run next in queue
    self.current = self.waiting.shift();
    self.current.run();
    self.done.push(self.current);
  }
};

/**
 * Respond to an HTTP request
 * @name BuildManager.respond
 * @function
 * @param {Object} res The HTTP response object
 * @param {Number} http_code The HTTP response code
 * @param {String} message The message to be sent
 */

BuildManager.prototype.respond = function (res, http_code, message) {
  var self = this;

  self.script_out = message;
  process.emit('refresh');

  res.writeHead(http_code, {'Content-Type': 'text/plain'});
  res.end(message);
};

module.exports = BuildManager;
