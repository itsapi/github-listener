var http = require('http'),
    url = require('url'),
    querystring = require('querystring'),
    exec = require('child_process').exec,
    jade = require('jade'),
    fs = require('fs');

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

function sendFile(response, filepath, type) {
  fs.readFile(filepath, function (err, data) {
    if (err) throw err;
    var text = data.toString();

    response.writeHead(200, {'Content-Type': type});
    response.end(text);
  });
}

function toHtml(string) {
  return string.replace(
    /((https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/,
    '<a href=\"$1\">$1</a>'
  )
}

var app = http.createServer(function(request, response) {

  var url_parts = url.parse(request.url, true)
  var path = url_parts.pathname.replace(/^\/|\/$/g, '');

  if (request.method == 'GET') {

    if (path == '') {
      var get_data = url_parts.query;

      if (get_data.refresh == undefined) {
        console.log('Sending HTML');

        var html = template({
          last_payload: JSON.stringify(last_payload, null, '  '),
          script_out: toHtml(script_out),
          timestamp: timestamp.toString()
        });

        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(html);

      } else {
        console.log('Sending JSON');

        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(
          JSON.stringify({
            last_payload: last_payload,
            script_out: toHtml(script_out),
            timestamp: timestamp.toString()
          })
        );

      }

    } else if (path == '/main.js') {
      console.log('Sending JS');
      sendFile(response, 'main.js', 'application/javascript');

    } else if (path == '/main.css') {
      console.log('Sending CSS');
      sendFile(response, 'main.css', 'text/css');

    } else {
      console.log('404: '+path)
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end('404 - File not found: '+path);
    }

  } else {

    var secret = path;
    secret = secret.substr(secret.lastIndexOf('/') + 1);
    if (secret == SECRET) {
      var body = '';
      timestamp = new Date();
      request.on('data', function(chunk) {
        body += chunk.toString();
      });

      request.on('end', function() {
        last_payload = JSON.parse(body);

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
          });
        } else {
          response.writeHead(400, {'Content-Type': 'text/plain'});
          console.log('Error: Invalid data: ' + JSON.stringify(last_payload));
          response.end('Error: Invalid data: ' + JSON.stringify(last_payload));
          script_out = 'Error: Invalid data';
        }
      });
    } else {
      response.writeHead(401, {'Content-Type': 'text/plain'});
      console.log('Error: Incorrect secret: ' + secret);
      response.end('Error: Incorrect secret: ' + secret);
    }
  }
}).listen(6003);

console.log('Server running at http://node.dvbris.com/git');