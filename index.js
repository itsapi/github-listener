var http = require('http'),
    url = require('url'),
    querystring = require('querystring'),
    exec = require('child_process').exec,
    jade = require('jade'),
    fs = require('fs');

var SECRET = '56237b8e3756fead5e5e1e78d5a3d1f7ba503e30acee56d990c6b09c9a6d1df1';

var last_payload = {};
var script_out = '';

var template;
fs.readFile('index.jade', function(err, data) {
  if (err) throw err;
  template = jade.compile(data.toString(), {pretty: true});
});

http.createServer( function(req, response) {
  if (req.method == 'GET') {
    console.log('GET request.')

    response.writeHead(200, {'Content-Type': 'text/html'});
    var html = template({
      last_payload: JSON.stringify(last_payload, null, '\t'),
      script_out: script_out
    });
    response.write(html);
    response.end();

  } else {

    response.writeHead(200, {'Content-Type': 'text/plain'});

    var secret = url.parse(req.url).pathname;
    secret = secret.substr(secret.lastIndexOf('/') + 1);
    if (secret == SECRET) {
      var body = '';
      req.on('data', function(chunk) {
        body += chunk.toString();
      });

      req.on('end', function() {
        last_payload = JSON.parse(body);
        console.log(new Date(), req.method, req.url);
        console.log(JSON.stringify(last_payload, null, '\t') + '\n');

        if (last_payload.repository && last_payload.repository.url) {
          var url = last_payload.repository.url;

          response.end('Waiting for script to finish');
          console.log('Waiting for script to finish\n');
          script_out = 'Waiting for script to finish';
          exec('/home/git/post-receive/run.sh ' + url, function(error, stdout, stderr) {
            var out = error ? stderr : stdout;
            console.log('\n' + out);
            console.log('Finished processing files\n');
            script_out = out;
          });
        } else {
          console.log('Error: Invalid data: ' + last_payload);
          response.end('Error: Invalid data: ' + last_payload);
        }
      });
    } else {
      console.log('Error: Incorrect secret: ' + secret);
      response.end('Error: Incorrect secret: ' + secret);
    }

  }
}).listen(6003);

console.log('Server running at http://node.dvbris.com/git');