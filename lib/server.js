'use strict';

const path = require('path');
const url = require('url');
const Checker = require('./check/checker');
const completion = require('./check/completion');
const extract = require('./check/extract');
const isContentJSON = require('./check/isContentJSON');
const register = require('./register');
const format = require('./template/format');
const hasTemplate = require('./template/hasTemplate').hasTemplate;
const bind = require('./template/bind');
const requireUncached = require('./require_hook/requireUncached');

class Server {
  constructor(options) {
    this.agreesPath = path.resolve(options.path);
    this.base = path.dirname(this.agreesPath);
    register();
  }

  useMiddleware(req, res, next) {
    const agrees = requireUncached(this.agreesPath).map((agree) => completion(agree, this.base));

    extract.incomingRequst(req).then((req) => {
      const agreeMatchList = agrees.map((agree) => {
        const match = Checker.request(agree.request, req);
        const matchCount = match.method * 1 + match.url * 1 + match.headers * 1 + match.query * 1 + match.body * 1;

        return { agree, match, matchCount }
      });

      const agreeMatch = agreeMatchList.find(({ match }) =>
        match.method && match.url && match.headers && match.query && match.body
      );

      if (!agreeMatch) {
        const isNotFound = !agreeMatchList.find((agree) => agree.match.method && agree.match.url)

        res.statusCode = isNotFound ? 404 : 400;
        res.write(isNotFound ? 'Agree Not Found' : 'Agree Bad Request');
        res.write('\n\nDo you mean this?\n');

        const maxMatchCount = agreeMatchList.reduce((a, b) => b.matchCount < a.matchCount ? a.matchCount : b.matchCount, 0);
        const maybeList = agreeMatchList.filter(({ matchCount }) => matchCount === maxMatchCount)

        maybeList.forEach(({ agree }) => {
          const { method, path, query, headers, body } = agree.request;
          res.write(JSON.stringify({ method, path, query, headers, body }, null, 2) + '\n\n');
        });

        res.write('\n\nYou requested\n');
        res.write(JSON.stringify(req, null, 2));
        res.end();

        typeof next === 'function' && next();
        return;
      }

      const agree = agreeMatch.agree

      // /foo/:id matched
      if (agree.request.pathToRegexpKeys.length > 0) {
        const pathname = url.parse(req.url).pathname;
        const result = agree.request.pathToRegexp.exec(pathname);
        const values = {};
        agree.request.pathToRegexpKeys.forEach((pathKey, index) => {
          values[pathKey.name] = result[index + 1];
        });
        agree.request.values = values;
      }

      if (agree.request.headers && hasTemplate(JSON.stringify(agree.request.headers))) {
        agree.request.values = Object.assign(agree.request.values, bind(agree.request.headers, req.headers));
      }

      if (agree.request.query && hasTemplate(JSON.stringify(agree.request.query))) {
        agree.request.values = Object.assign(agree.request.values, bind(agree.request.query, req.query));
      }

      if (agree.request.body && hasTemplate(JSON.stringify(agree.request.body))) {
        agree.request.values = Object.assign(agree.request.values, bind(agree.request.body, req.body));
      }

      res.statusCode = agree.response.status;
      Object.keys(agree.response.headers).forEach((header) => {
        res.setHeader(header, agree.response.headers[header]);
      });

      let messageBody = agree.response.body || '';

      if (agree.request.values) {
        messageBody = format(messageBody, agree.request.values);
      }

      if (agree.response.values) {
        messageBody = format(messageBody, Object.assign(agree.response.values, agree.request.values));
      }

      if (isContentJSON(agree.response)) {
        messageBody = JSON.stringify(messageBody);
      }

      res.end(messageBody);
    }).catch((e) => {
      typeof next === 'function' && next(e);
      process.nextTick(() => {
        throw e;
      });
    });
  }

}

module.exports = Server;
