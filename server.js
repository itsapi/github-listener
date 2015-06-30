var http = require('http'),
    socketio = require('socket.io'),
    url = require('url'),
    jade = require('jade'),
    fs = require('fs'),
    Listener = require('./listener'),
    ansi = new (require('ansi-to-html'))();


var Server = function (options) {
  var self = this;

  self.logging = options.logging;
  self.config = options.config;

  // Make listener
  self.listener = new Listener(self.config, self.logging);

  // Load the Jade template
  fs.readFile(__dirname + '/index.jade', function (err, data) {
    if (err) throw err;
    self.template = jade.compile(data.toString(), {pretty: true});
  });

  // Setup server
  var app = http.createServer(function (req, res) {
    var url_parts = url.parse(req.url, true);

    if (req.method == 'GET') {
      self.serve(url_parts, res);
    } else {
      self.listener.hook(req, res);
    }
  });

  // Set up the socket to send new data to the client.
  socketio(app).on('connection', function (socket) {
    process.on('refresh', function () {
      self.log('Data sent by socket');
      socket.emit('refresh', JSON.stringify(self.assemble_data()));
    });
  });

  // Start the server
  self.port = 6003;
  app.listen(self.port);
  self.log('Server running on port', self.port);

};


Server.prototype.send_file = function (res, path, type) {
  var self = this;

  fs.readFile(path, function (err, data) {
    if (err) throw err;

    res.writeHead(200, {'Content-Type': type});
    res.end(data);
  });
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


Server.prototype.serve = function (url_parts, res) {
  var self = this;

  if (url_parts.pathname == '/') {
    if (url_parts.query.refresh !== undefined) { // Send the data
      self.log('Data requested by GET');
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(self.assemble_data()));

    } else if (url_parts.query.rebuild !== undefined) { // Rebuild last_payload
      self.log('Rebuild requested');
      self.listener.build(res);

    } else { // Send the HTML
      var html = self.template(self.assemble_data(true));
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    }

  } else if (url_parts.pathname == '/main.js') {
    self.log('Sending JS');
    self.send_file(res, __dirname + '/static/main.js', 'application/javascript');

  } else if (url_parts.pathname == '/main.css') {
    self.log('Sending CSS');
    self.send_file(res, __dirname + '/static/main.css', 'text/css');

  } else if (url_parts.pathname.match(/\/icons\/\w*/)) {
    var name = url_parts.pathname.split('/').slice(-1)[0].toLowerCase();
    self.log('Sending icon: ' + name);
    self.send_file(res, __dirname + '/static/icons/' + name + '.png', 'image/png');

  } else {
    self.log('404: ' + url_parts.pathname);
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404 - File not found: ' + url_parts.pathname);
  }
};


Server.prototype.log = function () {
  var self = this;

  if (self.logging) console.log.apply(null, arguments);
};


module.exports = Server;
