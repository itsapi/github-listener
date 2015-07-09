var qs = require('querystring');
var crypto = require('crypto');


var Parser = function(data, headers, config) {
  this.body = data;
  this.headers = headers;
  this.config = config;
  this.data = {};
  this.payload = {};
};

var GitHub = (function() {
  var ghParser = function() { Parser.apply(this, arguments); };
  ghParser.prototype = Object.create(Parser.prototype);
  ghParser.prototype.constructor = ghParser;

  ghParser.prototype.parseBody = function() {
    try { return (this.payload = JSON.parse(this.body)); }
    catch (e) { return undefined; }
  };

  ghParser.prototype.verifySignature = function() {

    var signature = 'sha1=' + crypto.createHmac('sha1', this.config.github_secret)
                    .update(this.body)
                    .digest('hex');
    return this.headers['x-hub-signature'] === signature;
  };

  ghParser.prototype.extract = function() {
    if (!(this.payload.repository &&
          this.payload.repository.full_name &&
          this.payload.ref)) {
      return undefined;
    }

    return (this.data = {
      slug:   this.payload.repository.full_name,
      branch: this.payload.ref.replace(/^refs\/heads\//, ''),
      url:    this.payload.repository.url,
      commit: this.payload.head_commit ? this.payload.head_commit.message : undefined,
      image:  this.payload.sender ? this.payload.sender.avatar_url : undefined,
    });
  };

  return ghParser;
})();

var Travis = (function() {
  var travisParser = function() { Parser.apply(this, arguments); };
  travisParser.prototype = Object.create(Parser.prototype);
  travisParser.prototype.constructor = travisParser;

  travisParser.prototype.parseBody = function() {
    try { return (this.payload = JSON.parse(qs.parse(this.body.toString()).payload)); }
    catch (e) { return undefined; }
  };

  travisParser.prototype.verifySignature = function() {
    var signature = crypto.createHash('sha256')
                    .update(this.headers['travis-repo-slug'] + this.config.travis_token)
                    .digest('hex');
    return this.headers['authorization'] === signature;
  };

  travisParser.prototype.extract = function() {
    if (!(this.headers['travis-repo-slug'] && this.payload.branch)) {
      return undefined;
    }

    return (this.data = {
      slug:   this.headers['travis-repo-slug'],
      branch: this.payload.branch,
      commit: this.payload.message,
      url:    this.payload.repository ? this.payload.repository.url : undefined,
    });
  };

  return travisParser;
})();


module.exports = {
  GitHub: GitHub,
  Travis: Travis,
};
