Github Listener
===============
[![Build Status](https://travis-ci.org/itsapi/github-listener.svg?branch=master)](https://travis-ci.org/itsapi/github-listener)
[![Code Climate](https://codeclimate.com/github/itsapi/github-listener/badges/gpa.svg)](https://codeclimate.com/github/itsapi/github-listener)
[![Test Coverage](https://codeclimate.com/github/itsapi/github-listener/badges/coverage.svg)](https://codeclimate.com/github/itsapi/github-listener)

A Node.js continuous deployment system for Github and [TravisCI](https://travis-ci.org/). It detects a hook from Github when a repo is pushed, or from Travis when tests are complete, and pulls the changes in the server side repo using [github-getter](http://github.com/itsapi/github-getter). Then it runs the script in [post-receive](http://github.com/itsapi/post-receive) to build and push live.

An example setup script that we use to set up the deployment system can be found [here](https://gist.github.com/grit96/49b91a42007d1c977396).

Config
------

A `config.json` file is needed to tell the server what commands are run and the secret used in the Github or Travis hook.

Example:

```json
{
  "processing": "/home/git/deploy/processing",
  "repo_dir": "/home/git/deploy/repos",
  "getter": ". /home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}",
  "post_receive": "python3 /home/git/deploy/post-receive/main.py {dir} {name}",
  "secret": "HelloWorld",
  "travis_token": "top_secret"
}
```

Install and run
---------------

Clone the repository:

`git clone https://github.com/itsapi/github-listener && cd github-listener`

Install dependencies:

`npm install`

Run tests and start server:

`npm test && npm start`

Setting up webhooks
-------------------

In order for your listener to receive payloads you need to set up a webhook on Github or Travis:

- **Github** - follow the instructions [here](https://developer.github.com/webhooks/creating/) and put the webhook secret in `config.json` as `secret`
- **Travis** - follow the instructions [here](http://docs.travis-ci.com/user/notifications/#Webhook-notification) and put your user token in `config.json` as `travis_token`
