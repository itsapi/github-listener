

<!-- Start build-manager.js -->

## BuildManager(config, logs)

Creates a new `BuildManager` instance.

### Params:

* **Object** *config* The GHL `config.json` (see example)
* **Boolean** *logs* Output logs if `true`

## BuildManager.error(res, code, error)

Handles error responses

### Params:

* **Object** *res* The HTTP response object
* **Number** *code* The HTTP response code
* **Object** *error* The error object to be used (error message in err property)

## BuildManager.hook(req, res)

Handle a payload request

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

## BuildManager.rerun(id)

Run `self.build` if it is defined

### Params:

* **Number** *id* The build ID to rebuild

## BuildManager.queue(build)

Queue a build to be run

### Params:

* **Object** *build* The build to be queued

## BuildManager.next_in_queue()

Run the next function in the queue

## BuildManager.respond(res, http_code, data)

Respond to an HTTP request

### Params:

* **Object** *res* The HTTP response object
* **Number** *http_code* The HTTP response code
* **Object** *data* The data object to be sent

<!-- End build-manager.js -->

<!-- Start build.js -->

## Build.gen_build(repo, branch)

Create `self.build` function that can be rerun

### Params:

* **String** *repo* The name of the repo to be passed into `self.getter`
* **String** *branch* The name of the branch to be passed into `self.getter`

## Build.check_payload(req, res)

Ensure payload object is valid

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

## Build.run()

Run the stored self.build

## Build.getter(repo, branch, cb)

Run github-getter to get the repo from GitHub

### Params:

* **String** *repo* The repo to get from GitHub
* **String** *branch* The branch to checkout
* **Function** *cb* The callback to be run with the command output

## Build.post_receive(repo, cb)

Run the build scripts for the repo

### Params:

* **String** *repo* The repo name to be passed to post-receive
* **Function** *cb* The callback to be run with the command output

<!-- End build.js -->

<!-- Start server.js -->

## Server(options)

Creates a new `Server` instance.

### Params:

* **Object** *options* An object containing the following fields: 
 - `logging` (Boolean): Output logs if `true`
 - `config` (Object): The GHL `config.json` (see example)

## Server.start()

Start the http server

## Server.stop()

Stop the http server

## Server.serve(req, res)

Handle HTTP get requests

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

## Server.render()

Generate DOM to send to UI of builds dashboard

## Server.get_build(id)

Create an object of data to send to the client

### Params:

* **Number** *id* The ID of the build to be generated

<!-- End server.js -->

