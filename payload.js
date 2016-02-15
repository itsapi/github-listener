#!/usr/bin/env node

var http = require('http'),
    qs = require('querystring'),
    crypto = require('crypto'),
    config = require('./config'),
    argv = require('minimist')(process.argv.slice(2));


function selectRnd() {
  return arguments[parseInt(Math.random() * arguments.length)];
}

if (argv.h || argv.help) {
  console.log('Usage: ' + __filename + ' [options]\n');
  console.log('-h|--help    display this help message');
  console.log('-p|--port    port to send payload requests to');
  console.log('-t|--type    payload type to send (travis | github | error) - default github');
  console.log('-s|--secret  secret to add to URL');

  process.exit();
}

var type = (argv.t || argv.type || 'github').toLowerCase();
var port = parseInt(argv.p || argv.port || 6003);
var secret = argv.s || argv.secret;

var payload = {};
var options = {
  hostname: 'localhost',
  port: port,
  path: '/',
  method: 'POST'
};


if (type === 'travis') {

  var slug = 'travis/' + selectRnd('foo', 'bar', 'sheep');
  var url = 'http' + (Math.random() < 0.1 ? 's' : '') + '://' + selectRnd('example.com', 'google.com', 'test.co.uk');
  var branch = selectRnd('master', 'testing', 'stable', 'cats');
  var message = 'did some ' + selectRnd('cool', 'fun', 'weird', 'evil', 'ungodly', 'nightmare inducing') + ' stuff.';

  payload = qs.stringify({
    payload: JSON.stringify({
      repository: { url: url },
      branch: branch + (Math.random() < 0.05 ? 'PING' : ''),
      message: message
    })
  });

  options.headers = {
    'travis-repo-slug': slug,
    'authorization': crypto.createHash('sha256')
                     .update(slug + config.travis_token).digest('hex') +
                     (Math.random() < 0.05 ? 'BLOOP' : '')
  };

} else if (type === 'github') {

  var slug = 'github/' + selectRnd('death-ray', 'moon-harvester', 'autonomous-dragon', 'evil-plan-2.4', 'sheep-massacre');
  var url = 'http' + (Math.random() < 0.1 ? 's' : '') + '://' + selectRnd('github.com', 'dr-ev.il', 'githug.com', 'sheep-farm.org', 'mars-colony.ms', 'rare-ores.net');
  var branch = selectRnd('master', 'test', 'experimental', 'old', 'really-old', 'really-experimental', 'secret-side-project');
  var message = 'changed ' + selectRnd('all of it', 'most of it', 'the rest of it', 'the main part', 'a bit', 'a lot', 'a little', 'the bottom', 'the middle', 'the good bit', 'the important bit', 'the evil bit') + ' to be ' + selectRnd('better', 'worse', 'really good', 'fast', 'really fast', 'slow', 'really optimised', 'really complex', 'really evil', 'a bit more evil', 'a bit less evil', 'evil', 'obfuscated', 'less obfuscated', 'rabid', 'alive', 'intelligent', 'small') + '.';
  var sender = Math.random() < 0.25 ? { avatar_url: 'http://lorempixel.com/50/50/' } : undefined;
  var sha = crypto.createHash('sha256').update(slug + ':' + message).digest('hex');

  payload = JSON.stringify({
    repository: { full_name: slug, url: url + (Math.random() < 0.1 ? ('/' + sha) : '') },
    ref: 'refs/heads/' + branch + (Math.random() < 0.05 ? 'BEEP' : ''),
    head_commit: { message: message + (Math.random() < 0.1 ? ('\n\n' + sha) : '') },
    sender: sender
  });

  options.headers = {
    'x-hub-signature': 'sha1=' + crypto.createHmac('sha1', config.github_secret)
                                 .update(payload).digest('hex') +
                                 (Math.random() < 0.05 ? 'PLOP' : '')
  };

} else if (type === 'error') {

  payload = '{}';
  options.headers = {
    'x-hub-signature': 'sha1=' + crypto.createHmac('sha1', config.github_secret)
                                 .update(payload).digest('hex')
  };

} else {
  console.log('Run `' + __filename + ' --help` for usage');
}


if (branch !== 'master' && Math.random() > 0.05) {
  options.path += branch;
}

if (secret) {
  options.path += '?secret=' + secret;
}

console.log('Sending payload', payload);
http.request(options, function (res) {
  res.on('data', function (data) {
    console.log(data.toString());
  });
}).end(payload);
