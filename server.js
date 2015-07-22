var http = require('http'),
    socketio = require('socket.io'),
    url = require('url'),
    jade = require('jade'),
    fs = require('fs'),
    logging = require('logging-tool'),
    BuildManager = require('./build-manager'),
    ansi = new (require('ansi-to-html'))(),
    async = require('async-tools'),
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

  self.config = options.config;
  logging.silent = !options.logging;

  // Make build_manager
  self.build_manager = new BuildManager(self.config, options.logging);
  self.ready = ready;

  // Setup server
  self.app = http.createServer(function (req, res) {
    if (req.method === 'GET') {
      self.serve(req, res);
    } else {
      self.build_manager.hook(req, res);
    }
  });

  // Load the Jade templates
  self.templates = {};
  async.forEach(['index', 'build'], function (name, next) {
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
};

/**
 * Start the http server
 * @name Server.start
 * @function
 */

Server.prototype.start = function () {
  var self = this;

  // Start the server
  self.port = 6003;
  self.app.listen(self.port, function () {
    logging.info('Server running on port', self.port);
  });

  // Set up the socket to send new data to the client.
  socketio(self.app).on('connection', function (socket) {
    process.on('refresh', function () {
      logging.log('Data sent by socket');
      socket.emit('refresh', JSON.stringify(self.get_current_build()));
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
  var url_parts = url.parse(req.url, true);

  if (url_parts.pathname === '/') {
    if (url_parts.query.refresh !== undefined) { // Send the data
      logging.log('Data requested by GET');
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(self.get_current_build()));

    } else if (url_parts.query.rebuild !== undefined) { // Rebuild last_payload
      logging.log('Rebuild requested');
      self.build_manager.rerun(res);

    } else { // Send the HTML
      var html = self.templates.index(self.get_current_build());
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    }

  } else { // Serve static files
    logging.log('Serving file: ' + url_parts.pathname);
    fileserver.serve(req, res, function(e) {
      if (e && (e.status === 404)) {
        logging.log('404: ' + url_parts.pathname);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 - File not found: ' + url_parts.pathname);
      }
    });
  }
};

// NOTE: Not yet in use
Server.prototype.render_build = function (build) {
  var self = this;

  return self.templates.build(assemble_data(build));
};

/**
 * Create an object of data to send to the client
 * @name Server.get_current_build
 * @function
 */

Server.prototype.get_current_build = function () {
  var self = this;

  if (self.build_manager.current === undefined) {
    return {
      empty: true,
      status: self.build_manager.STATUS.READY
    };
  } else {
    return assemble_data(self.build_manager.current);
  }
};


function assemble_data (build) {
  return {
    last_payload: JSON.stringify(build.ui.payload, null, '  '),
    data: build.ui.data,
    script_out: ansi.toHtml(build.ui.script_out),
    timestamp: build.ui.timestamp.toString(),
    status: build.ui.status
  };
}


module.exports = Server;
