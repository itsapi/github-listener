var http = require('http');
var socketio = require('socket.io');
var url = require('url');
var jade = require('jade');
var fs = require('fs');
var logging = require('logging-tool');
var Listener = require('./listener');
var ansi = new (require('ansi-to-html'))();
var fileserver = new (require('node-static')).Server('./static');


var Server = function(options) {
  var self = this;

  self.logging = options.logging;
  self.config = options.config;

  logging.silent = !self.logging;

  // Make listener
  self.listener = new Listener(self.config, self.logging);

  // Load the Jade template
  fs.readFile(__dirname + '/index.jade', function(err, data) {
    if (err) {
      logging.error(err);
      throw err;
    }

    self.template = jade.compile(data.toString(), {pretty: true});
  });

  // Setup server
  self.app = http.createServer(function(req, res) {
    if (req.method === 'GET') {
      self.serve(req, res);
    } else {
      self.listener.hook(req, res);
    }
  });
};


Server.prototype.start = function() {
  var self = this;

  // Start the server
  self.port = 6003;
  self.app.listen(self.port, function() {
    logging.info('Server running on port', self.port);
  });

  // Set up the socket to send new data to the client.
  socketio(self.app).on('connection', function(socket) {
    process.on('refresh', function() {
      logging.log('Data sent by socket');
      socket.emit('refresh', JSON.stringify(self.assembleData()));
    });
    process.on('close', function() {
      socket.disconnect();
    });
  });
};


Server.prototype.stop = function() {
  var self = this;

  self.app.close(function() {
    logging.info('Server shutdown');
  });
  process.emit('close');
};


Server.prototype.assembleData = function(format) {
  var self = this;

  return {
    lastPayload: format ?
                 JSON.stringify(self.listener.lastPayload, null, '  ') :
                 self.listener.lastPayload,
    data: self.listener.data,
    scriptOut: ansi.toHtml(self.listener.scriptOut),
    timestamp: self.listener.timestamp.toString(),
    status: self.listener.status,
  };
};


Server.prototype.serve = function(req, res) {
  var self = this;
  var urlParts = url.parse(req.url, true);

  if (urlParts.pathname === '/') {
    if (urlParts.query.refresh !== undefined) { // Send the data
      logging.log('Data requested by GET');
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(self.assembleData()));

    } else if (urlParts.query.rebuild !== undefined) { // Rebuild lastPayload
      logging.log('Rebuild requested');
      self.listener.rerun(res);

    } else { // Send the HTML
      var html = self.template(self.assembleData(true));
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    }

  } else { // Serve static files
    logging.log('Serving file: ' + urlParts.pathname);
    fileserver.serve(req, res, function(e) {
      if (e && (e.status === 404)) {
        logging.log('404: ' + urlParts.pathname);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 - File not found: ' + urlParts.pathname);
      }
    });
  }

};


module.exports = Server;
