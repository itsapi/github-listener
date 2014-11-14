var http = require('http'),
    socketio = require('socket.io'),
    url = require('url'),
    exec = require('child_process').exec,
    events = new (require('events').EventEmitter)(),
    crypto = require('crypto'),
    jade = require('jade'),
    fs = require('fs'),
    bl = require('bl');


function to_html(string) {
  // Converts URLs to HTML links
  return string.replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}


function gen_header() {
  header = timestamp.toString();
  if (last_payload.repository && last_payload.head_commit) {
    header += ' | Commit: ' + last_payload.head_commit.message +
              ' | URL: ' + last_payload.repository.url;
  }
}


function assemble_data(format) {
  return {
    last_payload: format ? JSON.stringify(last_payload, null, '  ') : last_payload,
    script_out: to_html(script_out),
    header: to_html(header),
    status: status
  };
}


function send_file(res, path, type) {
  fs.readFile(path, function (err, data) {
    if (err) throw err;

    res.writeHead(200, {'Content-Type': type});
    res.end(data);
  });
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


function run_when_ready(func) {
  // Avoids running multiple requests at once.
  if (running) console.log('Script already running');
  function wait() {
    if (running) setTimeout(wait, 100);
    else func();
  }
  wait();
}


function respond(res, http_code, message) {
  console.log(message);

  script_out = message;
  events.emit('refresh');

  res.writeHead(http_code, {'Content-Type': 'text/plain'});
  res.end(message);
}


// Verify payload signature
function verify_payload(signature, secret, payload) {
  var hash = 'sha1=' + crypto.createHmac('sha1', secret).update(payload).digest('hex');
  return signature == hash;
}


function handle_hook(url_parts, req, res) {

  timestamp = new Date();

  // Get payload
  req.pipe(bl(function (err, data) {
    if (err) {
      respond(res, 400, 'Error whilst receiving payload');
      status = 'Error';
      return false;
    }

    run_when_ready(function () {
      running = true;

      try {
        last_payload = JSON.parse(data);
      } catch (e) {
        respond(res, 400, 'Error: Invalid payload');
        status = 'Error';
        running = false;
        return false;
      }

      console.log(new Date(), req.method, req.url);
      console.log(JSON.stringify(last_payload, null, '\t') + '\n');

      // Verify payload signature
      signature = req.headers['x-hub-signature'];
      if (!(signature && verify_payload(signature, SECRET, data))) {
        respond(res, 401, 'Error: Cannot verify payload signature');
        status = 'Error';
        running = false;
        return false;
      }

      // Check we have the information we need
      if (!(last_payload.repository && last_payload.repository.full_name)) {
        respond(res, 400, 'Error: Invalid data');
        status = 'Error';
        running = false;
        return false;
      }

      // Run script
      respond(res, 200, 'Waiting for script to finish');
      status = 'Waiting';

      branch = url.parse(req.url).pathname.replace(/^\/|\/$/g, '') || 'master';

      var command = '/home/git/post-receive/run.sh ' + last_payload.repository.full_name;
      exec(command, function(error, stdout, stderr) {
        var out = stdout + stderr;
        console.log('\n' + out);
        console.log('Finished processing files\n');

        script_out = out;
        status = 'Done';
        running = false;
        timestamp = new Date();
        events.emit('refresh');
      });

    });
  }));
}


var last_payload = {};
var script_out = '';
var status = 'Ready';
var header = '';
var timestamp = new Date();
var running = false;


// Load the secret from the file
var SECRET;
fs.readFile(__dirname + '/secret.txt', function(err, data) {
  if (err) throw err;
  data = data.toString();
  while (data.slice(-1) == '\n') {
    data = data.slice(0, -1);
  }
  SECRET = data;
});


// Load the Jade template
var template;
fs.readFile(__dirname + '/index.jade', function(err, data) {
  if (err) throw err;
  template = jade.compile(data.toString(), {pretty: true});
});


// Setup server
var app = http.createServer(function (req, res) {
  var url_parts = url.parse(req.url, true);

  if (req.method == 'GET') {
    serve(url_parts, res);
  } else {
    handle_hook(url_parts, req, res);
  }
});


// Set up the socket to send new data to the client.
var io = socketio(app);
io.on('connection', function(socket) {
  events.on('refresh', function() {
    console.log('Data sent by socket');
    gen_header();
    socket.emit('refresh', JSON.stringify(assemble_data()));
  });
});


// Start the server
var port = 6003;
app.listen(port);
console.log('Server running on port', port);
