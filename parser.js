var qs = require('querystring')
,   crypto = require('crypto');


var Parser = function (data, headers, config) {
  this.body = data;
  this.headers = headers;
  this.config = config;
  this.data = {};
  this.payload = {};
};

exports.GitHub = (function () {
  var gh_parser = function () { Parser.apply(this, arguments); };
  gh_parser.prototype = new Parser();

  gh_parser.prototype.parse_body = function () {
    try { return this.payload = JSON.parse(this.body); }
    catch (e) { return undefined; }
  };

  gh_parser.prototype.verify_signature = function () {
    var signature = 'sha1=' + crypto.createHmac('sha1', this.config.secret)
                    .update(this.body)
                    .digest('hex');
    return this.headers['x-hub-signature'] === signature;
   };

  gh_parser.prototype.extract = function () {
    try {
      return this.data =
      { slug:   this.payload.repository.full_name
      , branch: this.payload.ref.replace(/^refs\/heads\//, '')
      , url:    this.payload.repository.url
      , commit: this.payload.head_commit ? this.payload.head_commit.message : undefined
      , image:  this.payload.sender ? this.payload.sender.avatar_url : undefined
      };
    } catch (e) { return undefined; }
  };

  return gh_parser;
})();

exports.Travis = (function () {
  var travis_parser = function () { Parser.apply(this, arguments); };
  travis_parser.prototype = new Parser();

  travis_parser.prototype.parse_body = function () {
    try { return this.payload = JSON.parse(qs.parse(this.body.toString()).payload); }
    catch (e) { return undefined; }
  };

  travis_parser.prototype.verify_signature = function () {
    var signature = crypto.createHash('sha256')
                    .update(this.headers['travis-repo-slug'] + this.config.travis_token)
                    .digest('hex');
    return this.headers['authorization'] === signature;
  };

  travis_parser.prototype.extract = function () {
    try {
      return this.data =
      { slug:   this.headers['travis-repo-slug']
      , branch: this.payload.branch
      , url:    this.payload.repository.url
      , commit: this.payload.message
      }
    } catch (e) { return undefined; }
  };

  return travis_parser;
})();