var http = require('http'),
    url = require('url'),
    querystring = require('querystring'),
    exec = require('child_process').exec,
    jade = require('jade'),
    io = require('socket.io'),
    events = require('events'),
    fs = require('fs');

var ee = new events.EventEmitter();
var last_payload = {};
var script_out = '';
var timestamp = new Date();

var SECRET;
fs.readFile('secret.txt', function(err, data) {
  if (err) throw err;
  data = data.toString();
  while (data.slice(-1) == '\n') {
    data = data.slice(0, -1);
  }
  SECRET = data;
});

var template;
fs.readFile('index.jade', function(err, data) {
  if (err) throw err;
  template = jade.compile(data.toString(), {pretty: true});
});

var app = http.createServer(function(request, response) {
  if (request.method == 'GET') {
    console.log('GET request.');

    fs.readFile('main.js', function(err, data) {
      if (err) throw err;
      var socket_script = '\n'+data.toString()+'\n';

      fs.readFile('main.css', function(err, data) {
        if (err) throw err;
        var css = '\n'+data.toString()+'\n';

        var html = template({
          last_payload: JSON.stringify(last_payload, null, '\t'),
          script_out: script_out,
          socket_script: socket_script,
          css: css,
          timestamp: timestamp
        });

        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write(html);
        response.end();
      });
    });

  } else {

    var secret = url.parse(request.url).pathname;
    secret = secret.substr(secret.lastIndexOf('/') + 1);
    if (secret == SECRET) {
      var body = '';
      timestamp = new Date();
      request.on('data', function(chunk) {
        body += chunk.toString();
      });

      request.on('end', function() {
        last_payload = JSON.parse(body);
        ee.emit('update_out', last_payload, script_out);

        console.log(new Date(), request.method, request.url);
        console.log(JSON.stringify(last_payload, null, '\t') + '\n');

        if (last_payload.repository && last_payload.repository.url) {
          response.writeHead(200, {'Content-Type': 'text/plain'});
          var url = last_payload.repository.url;

          response.end('Waiting for script to finish');
          console.log('Waiting for script to finish\n');
          script_out = 'Waiting for script to finish';
          exec('/home/git/post-receive/run.sh ' + url, function(error, stdout, stderr) {
            var out = error ? stderr : stdout;
            console.log('\n' + out);
            console.log('Finished processing files\n');

            script_out = out;
            timestamp = new Date();
            ee.emit('update_out', last_payload, script_out);
          });
        } else {
          response.writeHead(400, {'Content-Type': 'text/plain'});
          console.log('Error: Invalid data: ' + JSON.stringify(last_payload));
          response.end('Error: Invalid data: ' + JSON.stringify(last_payload));
          script_out = 'Error: Invalid data';
          ee.emit('update_out');
        }
      });
    } else {
      response.writeHead(401, {'Content-Type': 'text/plain'});
      console.log('Error: Incorrect secret: ' + secret);
      response.end('Error: Incorrect secret: ' + secret);
    }
  }
});

io = io.listen(app, {resource: '/git/socket.io'});
app.listen(6003);

io.sockets.on('connection', function (socket) {
  ee.on('update_out', function (last_payload, script_out) {
    socket.emit('update_out', {last_payload: last_payload, script_out: script_out});
  });
});

console.log('Server running at http://node.dvbris.com/git');