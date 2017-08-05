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

import {
  prepareDatabase
}
from '../src/database';

chai.use(require('chai-http'));

const request = chai.request;

function setPort(config, port) {
  config = Object.assign({}, config);
  config.http = Object.assign({}, config.http);
  config.http.port = port;
  return config;
}

const config = {
  database: {
    file: "test.sqlite"
  },
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

describe('server', async() => {
  it('can /login', () =>
    prepareHttpServer(setPort(config, 12345)).then(({
        app, server
      }) =>
      request(server.listen())
      .get('/login?user=admin&password=start123')
      .then(res => expect(res).to.have.status(200))
    )
  );
  it('fails with invalid credentials /login', () =>
    prepareHttpServer(setPort(config, 12346)).then(({
        app, server
      }) =>
      request(server.listen())
      .get('/login?user=admin&password=unknown')
      .then(res => expect(res).to.have.status(401))
      .catch(err => {})
    )
  );

  const database = await prepareDatabase(config);

  it('can get /values', () =>
    prepareHttpServer(setPort(config, 12347), database).then(({
      app, server
    }) => {
      /* */
      const r = request(server.listen());
      return r.get('/login?user=admin&password=start123')
        .then(res => {
          const token = res.body.token;
          //console.log(token);
          return r.get('/values?jwt=' + token)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              console.log(res.body);
              return expect(res).to.have.status(200);
            });
        });
      /* */
    }));

});
