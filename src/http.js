/* jslint node: true, esnext: true */

'use struct';

const http = require('http'),
  https = require('https'),
  querystring = require('querystring'),
  jsonwebtoken = require('jsonwebtoken'),
  Koa = require('koa'),
  KoaJWT = require('koa-jwt'),
  Router = require('koa-better-router');

export function prepareHttpServer(config, database) {
  const app = new Koa();
  // if there is a cert configured use https, otherwise plain http
  const server = config.http.cert ? https.createServer(config.http, app.callback()) : http.createServer(app.callback());
  server.on('error', err => console.log(err));

  const router = Router();
  router.addRoute('GET', '/login', (ctx, next) => {
    const q = querystring.parse(ctx.request.querystring);
    const user = config.users[q.user];

    if (user !== undefined && user.password === q.password) {
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
    return next();
  });

  app.use(router.middleware());

  const restricted = KoaJWT({
    secret: config.http.auth.jwt.public
  });

  router.addRoute('GET', '/values', restricted, (ctx, next) => {

    //database.each('SELECT value,date FROM value', (err, row) => console.log(row.id + ": " + row.info));

    ctx.body = [{
      date: new Date(),
      value: 1.0
    }];

    return next();
  });

  app.listen(config.http.port, () => console.log(`Listening on port ${config.http.port}`));

  return Promise.resolve({
    app, server, router, restricted
  });
}
