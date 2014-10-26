var app = require('http').createServer(handler),
    io = require('socket.io')(app),
    url = require('url'),
    exec = require('child_process').exec,
    events = new (require('events').EventEmitter)(),
    jade = require('jade'),
    fs = require('fs');


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


function handler(req, res) {
  var url_parts = url.parse(req.url, true);

  if (req.method == 'GET') {
    serve(url_parts, res);
  } else {

    var secret = url_parts.pathname.slice(1);
    if (secret == SECRET) {
      var body = '';
      timestamp = new Date();
      req.on('data', function(chunk) {
        body += chunk.toString();
      });

      req.on('end', function() {

        if (running) console.log('Script already running');
        function wait() {
            if (running) setTimeout(wait, 100);
            else done();
        }
        wait();

        function done() {
          running = true;
          last_payload = JSON.parse(body);

          console.log(new Date(), req.method, req.url);
          console.log(JSON.stringify(last_payload, null, '\t') + '\n');

          if (last_payload.repository && last_payload.repository.url) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            var url = last_payload.repository.url;

            res.end('Waiting for script to finish');
            console.log('Waiting for script to finish\n');
            script_out = 'Waiting for script to finish';
            status = 'Waiting';
            events.emit('refresh');
            exec('/home/git/post-receive/run.sh ' + url, function(error, stdout, stderr) {
              var out = stdout + stderr;
              console.log('\n' + out);
              console.log('Finished processing files\n');

              script_out = out;
              status = 'Done';
              running = false;
              timestamp = new Date();
              events.emit('refresh');
            });

          } else {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            console.log('Error: Invalid data: ' + JSON.stringify(last_payload));
            res.end('Error: Invalid data: ' + JSON.stringify(last_payload));
            script_out = 'Error: Invalid data';
            status = 'Error';
            events.emit('refresh');
          }
        }
      });
    } else {
      res.writeHead(401, {'Content-Type': 'text/plain'});
      console.log('Error: Incorrect secret: ' + secret);
      res.end('Error: Incorrect secret: ' + secret);
    }
  }
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


// Set up the socket to send new data to the client.
io.on('connection', function(socket) {
  events.on('refresh', function() {
    console.log('Data sent by socket');
    gen_header();
    socket.emit('refresh', JSON.stringify(assemble_data()));
  });
});


var port = 6003;
app.listen(port);
console.log('Server running on port', port);
