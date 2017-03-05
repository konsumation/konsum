/* global describe, it, xit, before, after */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  fs = require('fs'),
  path = require('path');

import {
  prepareHttpServer
}
from '../src/http';

chai.use(require('chai-http'));

const request = chai.request;

function setPort(config, port) {
  config = Object.assign({}, config);
  config.http = Object.assign({}, config.http);
  config.http.port = port;
  return config;
}

const config = {
  users: {
    admin: {
      password: "start123",
      roles: ["admin"]
    }
  },
  http: {
    auth: {
      jwt: {
        public: fs.readFileSync(path.join(__dirname, '..', 'config', 'demo.rsa.pub')),
        private: fs.readFileSync(path.join(__dirname, '..', 'config', 'demo.rsa'))
      }
    }
  }
};

describe('server', () => {
  it('can /login', () =>
    prepareHttpServer(setPort(config, 12345)).then(({
        app, server
      }) =>
      request(server.listen())
      .get('/login?user=admin&password=start123')
      .then(res => expect(res).to.have.status(200))
      .catch(err => {
        throw err;
      })
    )
  );
  it('fails with invalid credentials /login', () =>
    prepareHttpServer(setPort(config, 12346)).then(({
        app, server
      }) =>
      request(server.listen())
      .get('/login?user=admin&password=unknown')
      .then(res => expect(res).to.have.status(401))
      .catch(err => {

        //console.log(err);
        //throw err;
      })
    )
  );
});
