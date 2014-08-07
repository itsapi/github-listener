Github Listener
===============

A Node.js continuous deployment system for Github. Detects a hook from Github when a repo is pushed to, and pulls the changes in the server side repo. Then it runs the script in [post-receive](http://github.com/itsapi/post-receive) to build and push live.
