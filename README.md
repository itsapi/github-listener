Github Listener
===============
[![Build Status](https://travis-ci.org/itsapi/github-listener.svg?branch=master)](https://travis-ci.org/itsapi/github-listener)
[![Code Climate](https://codeclimate.com/github/itsapi/github-listener/badges/gpa.svg)](https://codeclimate.com/github/itsapi/github-listener)

A Node.js continuous deployment system for Github. Detects a hook from Github when a repo is pushed to, and pulls the changes in the server side repo using [github-getter](http://github.com/itsapi/github-getter). Then it runs the script in [post-receive](http://github.com/itsapi/post-receive) to build and push live.

An example setup script that we use to set up the deployment system can be found [here](https://gist.github.com/grit96/49b91a42007d1c977396).

Config
------

A `config.json` file is needed to tell the server what commands are run and the secret used in the Github hook.

Example:

```json
{
  "processing": "/home/git/deploy/processing",
  "repo_dir": "/home/git/deploy/repos",
  "getter": ". /home/git/deploy/github-getter/get.sh {repo_dir} {output} {repo} {branch}",
  "post_receive": "python3 /home/git/deploy/post-receive/main.py {dir} {name}",
  "secret": "HelloWorld"
}
```
