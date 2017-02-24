/* global describe, it, xit, before, after */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  fs = require('fs'),
  path = require('path');

  import
  {
    prepareHttpServer
  } from '../src/http';

chai.use(require('chai-http'));

const request = chai.request;

const config = {
  http: { port: 12345,
  auth: { jwt: {
    public: fs.readFileSync(path.join(__dirname,'..','config','demo.rsa.pub')),
    private: fs.readFileSync(path.join(__dirname,'..','config','demo.rsa'))
  }}
}
};

describe('server', () => {
    it('can /login', () =>
      prepareHttpServer(config).then(({app,server}) => {
        const a = server.listen();
        return request(a)
          .get('/login?user=admin&password=start123').then(res => {
            expect(res).to.have.status(200);
          }).catch(err => {throw err;});
      })
    );
});
