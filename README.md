# Github Listener

[![NPM Version](https://img.shields.io/npm/v/github-listener.svg)](https://www.npmjs.com/package/github-listener)
[![Build Status](https://img.shields.io/travis/itsapi/github-listener/master.svg)](https://travis-ci.org/itsapi/github-listener)
[![Dependency Status](https://img.shields.io/david/itsapi/github-listener.svg)](https://david-dm.org/itsapi/github-listener)
[![Maintainability](https://api.codeclimate.com/v1/badges/220c824557a13845bf4f/maintainability)](https://codeclimate.com/github/itsapi/github-listener/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/220c824557a13845bf4f/test_coverage)](https://codeclimate.com/github/itsapi/github-listener/test_coverage)

A Node.js continuous deployment system for Github and [TravisCI](https://travis-ci.org/). It detects a hook from Github when a repo is pushed, or from Travis when tests are complete, and pulls the changes in the server side repo using [github-getter](https://github.com/itsapi/github-getter). Then it runs the script in [post-receive](https://github.com/itsapi/post-receive) to build and push live.

An example setup script that we use to set up the deployment system can be found [here](https://gist.github.com/grit96/49b91a42007d1c977396).


## Installation

```sh
$ npm install -g github-listener
```


## Help

```
Usage: github-listener [options]

-h|--help      display this help message
-v|--version   display the version number
-q|--quiet     suppress logging
-p|--port      port to run Github Listener on
-c|--config    path to JSON config file (default ./config.json)
```


## Config

A `config.json` file is needed to tell the server what commands are run and the secret used in the Github or Travis hook.

Example:

```json
{
  "processing": "/home/git/deploy/processing",
  "repo_dir": "/home/git/deploy/repos",
  "getter": "/home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}",
  "post_receive": "/home/git/deploy/post-receive/bin/post-receive -p {dir}",
  "github_secret": "secret_github_secret",
  "travis_token": "secret_travis_token",
  "url_secret": "secret_url_secret"
}
```


## Setting up webhooks

In order for your listener to receive payloads you need to set up a webhook on Github or Travis:

- **Github** - follow the instructions [here](https://developer.github.com/webhooks/creating/) and put the webhook secret in `config.json` as `github_secret`
- **Travis** - follow the instructions [here](https://docs.travis-ci.com/user/notifications/#Webhook-notification) and put your user token in `config.json` as `travis_token`

If the service you are using does not sign the payloads or provide authorisation headers, you can use the `url_secret` option and add a `?secret=` to the webhook url.

### URL Parameters

- `secret` - verify payload if URL secret in `config.json` matches this
- `branch` - run build if branch in payload matches this (defaults to master if omitted)
- `semver` - run build if branch in payload matches semver (e.g. v1.2.3)

Example: `https://git.example.com/?semver&secret=pass1234&branch=dev`


## Documentation

See the [DOCUMENTATION.md](./DOCUMENTATION.md) file.


## Contributing

1. Create an issue with your bug or suggestion
2. Fork the repository
3. Make your changes in your fork
4. Create a pull request here, referencing the original issue


### Testing

`npm test` will run some tests which cover the majority of the functionality.
You can also send test payloads to a server with the [`payload.js`](./payload.js) program to test the front end: `./payload.js --help`.

`npm start` will start the server.


## License

See the [LICENSE](./LICENSE) file.
