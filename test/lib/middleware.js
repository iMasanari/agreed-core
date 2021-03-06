'use strict';

const Server = require(`${process.cwd()}/lib/server.js`);

const AssertStream = require('assert-stream');
const test = require('eater/runner').test;
const http = require('http');
const plzPort = require('plz-port');

test('feat(middleware): http GET API', () => {
  plzPort().then((port) => {
    const agreedServer = new Server({ path: 'test/agrees/agrees.js' });
    const server = http.createServer((req, res) => {
      agreedServer.useMiddleware(req, res);
    }).listen(port);

    server.on('listening', () => {
      http.get('http://localhost:' + port + '/hoge/fuga?q=foo', (res) => {
        const assert = new AssertStream();
        assert.expect({"message":"hello world"});
        res.pipe(assert);
        server.close();
      });
    });
  });
});

test('feat(middleware): http PORT API', (done) => {
  plzPort().then((port) => {
    const agreedServer = new Server({ path: 'test/agrees/agrees.js' });
    const server = http.createServer((req, res) => {
      agreedServer.useMiddleware(req, res);
    }).listen(port);


    server.on('listening', () => {
      const postData = JSON.stringify({
        message: 'foobarbaz',
        abc: 'foobarbaz',
      });
      const options = {
        host: 'localhost',
        method: 'POST',
        path: '/hoge/abc',
        port: port,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      const req = http.request(options, (res) => {
        const assert = new AssertStream();
        assert.expect({"message":"hello post"});
        res.pipe(assert);
        server.close();
      });

      req.write(postData);
      req.end();
    });
  });
});

