var http = require('http'),
    socketio = require('socket.io'),
    url = require('url'),
    jade = require('jade'),
    fs = require('fs'),
    logging = require('logging-tool'),
    Listener = require('./listener'),
    ansi = new (require('ansi-to-html'))(),
    fileserver = new (require('node-static')).Server('./static');


var Server = function (options) {
  var self = this;

  self.logging = options.logging;
  self.config = options.config;

  logging.silent = !self.logging;

  // Make listener
  self.listener = new Listener(self.config, self.logging);

  // Load the Jade template
  fs.readFile(__dirname + '/index.jade', function (err, data) {
    if (err) {
      logging.error(err);
      throw err;
    }

    self.template = jade.compile(data.toString(), {pretty: true});
  });

  // Setup server
  self.app = http.createServer(function (req, res) {
    if (req.method === 'GET') {
      self.serve(req, res);
    } else {
      self.listener.hook(req, res);
    }
  });
};


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
      socket.emit('refresh', JSON.stringify(self.assemble_data()));
    });
    process.on('close', function () {
      socket.disconnect();
    });
  });
};


Server.prototype.stop = function () {
  var self = this;

  self.app.close(function () {
    logging.info('Server shutdown');
  });
  process.emit('close');
};


Server.prototype.assemble_data = function (format) {
  var self = this;

  return {
    last_payload: format ? JSON.stringify(self.listener.last_payload, null, '  ') : self.listener.last_payload,
    data: self.listener.data,
    script_out: ansi.toHtml(self.listener.script_out),
    timestamp: self.listener.timestamp.toString(),
    status: self.listener.status
  };
};


Server.prototype.serve = function (req, res) {
  var self = this;
  var url_parts = url.parse(req.url, true);

  if (url_parts.pathname === '/') {
    if (url_parts.query.refresh !== undefined) { // Send the data
      logging.log('Data requested by GET');
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(self.assemble_data()));

    } else if (url_parts.query.rebuild !== undefined) { // Rebuild last_payload
      logging.log('Rebuild requested');
      self.listener.build(res);

    } else { // Send the HTML
      var html = self.template(self.assemble_data(true));
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


module.exports = Server;
