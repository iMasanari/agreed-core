'use strict';

const isInclude = require('./isInclude');
const url = require("url");

class Checker {
  static request(request, req) {
    const parsedUrl = url.parse(req.url);
    return {
      method: Checker.method(request.method, req.method),
      url: Checker.url(request.pathToRegexp, parsedUrl.pathname),
      headers: Checker.headers(request.headers, req.headers),
      query: Checker.query(request.query, req.query),
      body: Checker.body(request.body, req.body),
    }
  }

  static method(entryMethod, reqMethod) {
    return entryMethod.toLowerCase() === reqMethod.toLowerCase();
  }

  static url(entryUrl, reqUrl) {
    return entryUrl.exec(reqUrl) ? true : false;
  }

  static headers(entryHeaders, reqHeaders) {
    if (!entryHeaders) return true;
    return isInclude(entryHeaders, reqHeaders);
  }

  static body(entryBody, reqBody) {
    if (!entryBody) return true;
    return isInclude(entryBody, reqBody);
  }

  static query(entryQuery, reqQuery) {
    if (!entryQuery) return true;
    return isInclude(entryQuery, reqQuery);
  }

  static status(entryStatus, resStatus) {
    return entryStatus === resStatus;
  }
}

module.exports = Checker;
