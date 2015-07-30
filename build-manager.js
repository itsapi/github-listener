var bl = require('bl'),
    logging = require('logging-tool'),
    format = require('string-format'),
    Build = require('./build');

format.extend(String.prototype);

var ids = 0;

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
  self.builds = {};
  self.running = false;

  self.STATUS = {
    WAITING: 'Waiting',
    RUNNING: 'Running',
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
 * @param {Object} error The error object to be used (error message in err property)
 */

BuildManager.prototype.error = function (res, code, error) {
  var self = this;

  self.logging.warn(error.err);
  self.respond(res, code, error);
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
      return self.error(res, 400, {err: 'Error whilst receiving payload'});
    }

    var id = ids++;

    self.builds[id] = new Build(req, res, data, self, id);
    self.builds[id].check_payload();
    self.queue(id);
  }));
};

/**
 * Run `self.build` if it is defined
 * @name BuildManager.rerun
 * @function
 * @param {Number} id The build ID to rebuild
 */

BuildManager.prototype.rerun = function (id) {
  var self = this;

  if (self.builds[id]) {
    self.queue(id);
    return true;
  } else {
    return false;
  }
};

/**
 * Queue a build to be run
 * @name BuildManager.queue
 * @function
 * @param {Object} build The build to be queued
 */

BuildManager.prototype.queue = function (id) {
  var self = this;
  var build = self.builds[id];

  if (build === undefined || build.err) {
    return;
  }

  build.log = '';
  build.ui.status = self.STATUS.WAITING;
  process.emit('send_update', id);

  // Avoids running multiple requests at once.
  if (self.waiting.length || self.running) {
    logging.info('Script already running');
    self.waiting.push(id);
  } else {
    self.running = true;
    self.current = id;
    build.run();
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
    self.running = true;
    self.current = self.waiting.shift();
    self.builds[self.current].run();
  }
};

/**
 * Respond to an HTTP request
 * @name BuildManager.respond
 * @function
 * @param {Object} res The HTTP response object
 * @param {Number} http_code The HTTP response code
 * @param {Object} data The data object to be sent
 */

BuildManager.prototype.respond = function (res, http_code, data) {
  res.writeHead(http_code, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(data));
};

module.exports = BuildManager;
