var http = require('http'),
    qs = require('querystring'),
    crypto = require('crypto'),
    config = require('./config');


function selectRnd() {
  return arguments[parseInt(Math.random() * arguments.length)];
}


var payload = {};
var options = {
  hostname: 'localhost',
  port: 6003,
  path: '/',
  method: 'POST'
};


if (process.argv[2] === 'travis') {
  var slug = 'travis/' + selectRnd('foo', 'bar', 'sheep');
  var url = 'http' + (Math.random() < 0.1 ? 's' : '') + '://' + selectRnd('example.com', 'google.com', 'test.co.uk');
  var branch = selectRnd('master', 'testing', 'stable', 'cats');
  var message = 'did some ' + selectRnd('cool', 'fun', 'weird', 'evil', 'ungodly', 'nightmare inducing') + ' stuff.';
  var sender = Math.random() < 0.25 ? { avatar_url: 'http://lorempixel.com/50/50/' } : undefined;

  payload = qs.stringify({
    payload: JSON.stringify({
      repository: { url: url },
      branch: branch,
      message: message,
      sender: sender
    })
  });

  options.headers = {
    'travis-repo-slug': slug,
    'authorization': crypto.createHash('sha256')
                     .update(slug + config.travis_token).digest('hex')
  };

} else {
  var slug = 'github/' + selectRnd('death-ray', 'moon-harvester', 'autonomous-dragon', 'evil-plan-2.4', 'sheep-massacre');
  var url = 'http' + (Math.random() < 0.1 ? 's' : '') + '://' + selectRnd('github.com', 'dr-ev.il', 'githug.com', 'sheep-farm.org', 'mars-colony.ms', 'rare-ores.net');
  var branch = selectRnd('master', 'test', 'experimental', 'old', 'really-old', 'really-experimental', 'secret-side-project');
  var message = 'changed ' + selectRnd('all of it', 'most of it', 'the rest of it', 'the main part', 'a bit', 'a lot', 'a little', 'the bottom', 'the middle', 'the good bit', 'the important bit', 'the evil bit') + ' to be ' + selectRnd('better', 'worse', 'really good', 'fast', 'really fast', 'slow', 'really optimised', 'really complex', 'really evil', 'a bit more evil', 'a bit less evil', 'evil', 'obfuscated', 'less obfuscated', 'rabid', 'alive', 'intelligent', 'small') + '.';


  payload = JSON.stringify({
    repository: { full_name: slug, url: url },
    ref: 'refs/heads/' + branch,
    head_commit: { message: message }
  });

  options.headers = {
    'x-hub-signature': 'sha1=' + crypto.createHmac('sha1', config.github_secret)
                                 .update(payload).digest('hex')
  };
}

if (branch !== 'master' && Math.random() > 0.05) {
  options.path += branch;
}

http.request(options, function (res) {
  res.on('data', function (data) {
    console.log(data.toString());
  });
}).end(payload);
