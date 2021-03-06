var http = require('http'),
    https = require('https'),
    socketio = require('socket.io'),
    url = require('url'),
    jade = require('jade'),
    fs = require('fs'),
    async = require('async-tools'),
    logging = require('logging-tool'),
    BuildManager = require('./build-manager'),
    ansi = new (require('ansi-to-html'))(),
    fileserver = new (require('node-static')).Server('./static');


/**
 * Creates a new `Server` instance.
 * @name Server
 * @function
 * @param {Object} options An object containing the following fields:
 *
 *  - `logging` (Boolean): Output logs if `true`
 *  - `config` (Object): The GHL `config.json` (see example)
 */

var Server = function (options, ready) {
  var self = this;

  self.port = options.port || 6003;
  self.config = options.config;
  logging.silent = !options.logging;

  // Make build_manager
  self.build_manager = new BuildManager(self.config, options.logging);
  self.ready = ready;

  self.STATUS = {
    READY: 'Ready',
    RUNNING: 'Running'
  };

  // Setup server
  self.app = http.createServer(function (req, res) {
    var url_parts = url.parse(req.url, true);
    for (var key in url_parts) {req[key] = url_parts[key]; }

    if (req.method === 'GET') {
      self.serve(req, res);
    } else {
      self.build_manager.hook(req, res);
    }
  });

  // Load the Jade templates
  self.templates = {};
  async.forEach(['index'], function (name, next) {
    fs.readFile(__dirname + '/' + name + '.jade', function (err, data) {
      if (err) {
        logging.error(err);
        throw err;
      }

      self.templates[name] = jade.compile(data.toString(), {pretty: true});
    });
    next();

  }, function () {

    // Server ready!
    self.ready(self);

  });

  // Load Travis public key
  https.get('https://api.travis-ci.org/config', function (res) {
    var body = '';
    res.on('data', function(data) {
        body += data;
    });
    res.on('end', function() {
      var json = JSON.parse(body);
      self.config.travis_public_key = json.config.notifications.webhook.public_key;
    });
  });
};

/**
 * Start the http server
 * @name Server.start
 * @function
 */

Server.prototype.start = function () {
  var self = this;

  // Start the server
  self.app.listen(self.port, function () {
    logging.info('Server running on port', self.port);
  });

  // Set up the socket to send new data to the client.
  socketio(self.app).on('connection', function (socket) {

    socket.on('rerun', function (build_id) {
      if (!self.build_manager.rerun(build_id)) {
        socket.emit('rerun_error', build_id);
      }
    });

    socket.on('request_update', function (build_id) {
      process.emit('send_update', build_id);
    });

    socket.on('request_all', function () {
      var statuses = {};
      for (var id in self.build_manager.builds) {
        statuses[id] = self.build_manager.builds[id].ui.status;
      }
      socket.emit('send_all', JSON.stringify(statuses));
    });

    process.on('send_update', function (build_id) {
      logging.log('Data sent by socket');
      socket.emit('send_update', JSON.stringify({
        status: self.build_manager.running ?
                self.STATUS.RUNNING : self.STATUS.READY,
        build_ui: self.get_build(build_id)
      }));
    });

    process.on('close', function () {
      socket.disconnect();
    });
  });
};

/**
 * Stop the http server
 * @name Server.stop
 * @function
 */

Server.prototype.stop = function () {
  var self = this;

  self.app.close(function () {
    logging.info('Server shutdown');
  });
  process.emit('close');
};

/**
 * Handle HTTP get requests
 * @name Server.serve
 * @function
 * @param {Object} req The HTTP request object
 * @param {Object} res The HTTP response object
 */

Server.prototype.serve = function (req, res) {
  var self = this;

  if (req.pathname === '/') {
    if (req.query.rebuild !== undefined) { // Rebuild last_payload
      logging.log('Rebuild requested');
      self.build_manager.rerun(res, parseInt(req.query.rebuild));

    } else { // Send the HTML
      var html = self.templates.index(self.status());
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    }

  } else if (req.pathname === '/status') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(self.status()));

  } else { // Serve static files
    logging.log('Serving file: ' + req.pathname);
    fileserver.serve(req, res, function(e) {
      if (e && (e.status === 404)) {
        logging.log('404: ' + req.pathname);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 - File not found: ' + req.pathname);
      }
    });
  }
};

/**
 * Generate data to send to builds dashboardself.templates.index)(
 * @name Server.status
 * @function
 */

Server.prototype.status = function () {
  var self = this;

  // Sort builds
  var builds = Object.keys(self.build_manager.builds)
  .sort(function (a, b) {
    return parseInt(b) - parseInt(a);
  }).map(function(id){
    return self.get_build(id);
  });

  var current = self.build_manager.current !== undefined ?
                self.get_build(self.build_manager.current) :
                builds.length ? builds[0] : {empty: true, data: {}};

  return {
    status: self.build_manager.running ? self.STATUS.RUNNING : self.STATUS.READY,
    builds: builds,
    current: current
  };
};

/**
 * Create an object of data to send to the client
 * @name Server.get_build
 * @function
 * @param {Number} id The ID of the build to be generated
 */

Server.prototype.get_build = function (id) {
  var self = this;
  var build = self.build_manager.builds[id];

  return {
    id: build.id,
    payload: JSON.stringify(build.ui.payload, null, '  '),
    data: build.ui.data,
    log: ansi.toHtml(build.ui.log),
    timestamp: build.ui.timestamp.toString(),
    status: build.ui.status
  };
};


module.exports = Server;
