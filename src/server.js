/* jslint node: true, esnext: true */

'use struct';

const path = require('path'),
  program = require('commander'),
  http = require('http'),
  https = require('https'),
  sqlite3 = require('sqlite3').verbose(),
  querystring = require('querystring'),
  jsonwebtoken = require('jsonwebtoken'),
  Koa = require('koa'),
  KoaJWT = require('koa-jwt'),
  Router = require('koa-better-router');

import {
  expand
}
from 'config-expander';

import {
  prepareDatabase
}
from './database';

program
  .description('Konsum server')
  //  .version(module.exports.version)
  .option('-c, --config <file>', 'use config from file')
  .parse(process.argv);

const constants = {
  basedir: path.dirname(program.config || process.cwd()),
  installdir: path.resolve(__dirname, '..')
};

const defaultConfig = {
  database: 'sample.sqlite',
  http: {
    port: 123456
  }
};

expand(program.config ? "${include('" + path.basename(program.config) + "')}" : defaultConfig, {
    constants
  })
  .then(config => prepareDatabase(config).then(db => {

    const app = new Koa();

    // if there is a cert configured use https otherwise plain http
    const server = config.http.cert ? https.createServer(config.http, app.callback()) : http.createServer(app.callback());
    server.on('error', err => console.log(err));

    const router = Router();
    router.addRoute('GET', '/login', (ctx, next) => new Promise((fullfill, reject) => {
      const q = querystring.parse(ctx.request.querystring);

      if (q.user === 'admin' && q.password === 'start123') {
        const claims = {
          permissions: 'all',
          iss: 'http://myDomain'
        };
        const token = jsonwebtoken.sign(claims, config.http.auth.jwt.private, {
          algorithm: 'RS256',
          expiresIn: config.http.auth.jwt.expires || '12h'
        });
        ctx.status = 200;
        ctx.body = {
          token, message: 'Successfully logged in!'
        };
      } else {
        ctx.status = 401;
        ctx.body = {
          message: 'Authentication failed'
        };
      }
      fullfill(next());
    }));

    app.use(router.middleware());
    app.listen(config.http.port, () => console.log(`Listening on port ${config.http.port}`));

    db.close();
  }));
