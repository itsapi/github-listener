

<!-- Start listener.js -->

## Listener(config, logs)

Creates a new `Listener` instance.

### Params:

* **Object** *config* The GHL `config.json` (see example)
* **Boolean** *logs* Output logs if `true`

## Listener.error(res, code, message, hide)

Handles error responses

### Params:

* **Object** *res* The HTTP response object
* **Number** *code* The HTTP response code
* **String** *message* The error message to be used
* **Boolean** *hide* Don't update client side if `true`

## Listener.hook(req, res)

Handle a payload request

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

## Listener.check_payload(req, res)

Ensure payload object is valid

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

## Listener.gen_build(repo, branch)

Create `self.build` function that can be rerun

### Params:

* **String** *repo* The name of the repo to be passed into `self.getter`
* **String** *branch* The name of the branch to be passed into `self.getter`

## Listener.rerun(res)

Run `self.build` if it is defined

### Params:

* **Object** *res* The HTTP response object

## Listener.getter(repo, branch, cb)

Run github-getter to get the repo from GitHub

### Params:

* **String** *repo* The repo to get from GitHub
* **String** *branch* The branch to checkout
* **Function** *cb* The callback to be run with the command output

## Listener.post_receive(repo, cb)

Run the build scripts for the repo

### Params:

* **String** *repo* The repo name to be passed to post-receive
* **Function** *cb* The callback to be run with the command output

## Listener.queue(func)

Queue a function to be run

### Params:

* **Function** *func* The function to be queued

## Listener.next_in_queue()

Run the next function in the queue

## Listener.respond(res, http_code, message, not_refresh)

Respond to an HTTP request

### Params:

* **Object** *res* The HTTP response object
* **Number** *http_code* The HTTP response code
* **String** *message* The message to be sent
* **Boolean** *not_refresh* Don't update client side if `true`

<!-- End listener.js -->

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

## Server.assemble_data(format)

Create an object of data to send to the client

### Params:

* **Boolean** *format* JSON.stringify() if `true`

## Server.serve(req, res)

Handle HTTP get requests

### Params:

* **Object** *req* The HTTP request object
* **Object** *res* The HTTP response object

<!-- End server.js -->

