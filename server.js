var http = require('http'),
    socketio = require('socket.io'),
    url = require('url'),
    jade = require('jade'),
    fs = require('fs'),
    config = require('./config.json'),
    Listener = require('./listener');


var header = '';

function gen_header() {
  header = listener.timestamp.toString();
  if (listener.last_payload.repository && listener.last_payload.head_commit) {
    header += ' | Commit: ' + listener.last_payload.head_commit.message +
              ' | URL: ' + listener.last_payload.repository.url;
  }
}


function send_file(res, path, type) {
  fs.readFile(path, function (err, data) {
    if (err) throw err;

    res.writeHead(200, {'Content-Type': type});
    res.end(data);
  });
}


function to_html(string) {
  // Converts URLs to HTML links
  return string.replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}


function assemble_data(format) {
  return {
    last_payload: format ? JSON.stringify(listener.last_payload, null, '  ') : listener.last_payload,
    script_out: to_html(listener.script_out),
    header: to_html(header),
    status: listener.status
  };
}


function serve(url_parts, res) {
  if (url_parts.pathname == '/') {
    if (url_parts.query.refresh === undefined) { // Send the HTML
      var html = template(assemble_data(true));
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);

    } else { // Send the data
      console.log('Data requested by GET');
      gen_header();
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(assemble_data()));
    }

  } else if (url_parts.pathname == '/main.js') {
    console.log('Sending JS');
    send_file(res, __dirname + '/static/main.js', 'application/javascript');

  } else if (url_parts.pathname == '/main.css') {
    console.log('Sending CSS');
    send_file(res, __dirname + '/static/main.css', 'text/css');

  } else if (url_parts.pathname.match(/\/icons\/\w*/)) {
    var name = url_parts.pathname.split('/').slice(-1)[0].toLowerCase();
    console.log('Sending icon: ' + name);
    send_file(res, __dirname + '/static/icons/' + name + '.png', 'image/png');

  } else {
    console.log('404: ' + url_parts.pathname);
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404 - File not found: ' + url_parts.pathname);
  }
}


// Make listener
var listener = new Listener(config, true);


// Load the Jade template
var template;
fs.readFile(__dirname + '/index.jade', function (err, data) {
  if (err) throw err;
  template = jade.compile(data.toString(), {pretty: true});
});


// Setup server
var app = http.createServer(function (req, res) {
  var url_parts = url.parse(req.url, true);

  if (req.method == 'GET') {
    serve(url_parts, res);
  } else {
    listener.hook(req, res);
  }
});


// Set up the socket to send new data to the client.
var io = socketio(app);
io.on('connection', function (socket) {
  process.on('refresh', function () {
    console.log('Data sent by socket');
    gen_header();
    socket.emit('refresh', JSON.stringify(assemble_data()));
  });
});


// Start the server
var port = 6003;
app.listen(port);
console.log('Server running on port', port);