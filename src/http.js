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
  const server = config.http.cert
    ? https.createServer(config.http, app.callback())
    : http.createServer(app.callback());
  server.on('error', err => console.log(err));
  const router = Router();

  /**
   * login to request api token
   */
  router.addRoute('GET', '/login', (ctx, next) => {
    const q = querystring.parse(ctx.request.querystring);
    const user = config.users[q.user];

    if (user !== undefined && user.password === q.password) {
      const claims = {
        permissions: user.roles.join(','),
        iss: 'http://myDomain'
      };
      const token = jsonwebtoken.sign(
        claims,
        config.http.auth.jwt.private,
        mergeDefaults(
          {
            algorithm: 'RS256',
            expiresIn: '12h'
          },
          config.http.auth.jwt
        )
      );
      ctx.status = 200;
      ctx.body = {
        token,
        message: 'Successfully logged in!'
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

  // middleware to restrict access to token holding requests
  const restricted = KoaJWT({
    secret: config.http.auth.jwt.public
  });

  router.addRoute(
    'GET',
    '/values',
      /*restricted,*/(ctx, next) =>
      new Promise((fullfill, reject) =>
        database.createReadStream()
          .on('data', function (data) {
            console.log(data.key, '=', data.value);
          })
          .on('error', function (err) {
            ctx.status = 401;
            ctx.body = err;
            reject(err);
          })
          .on('close', function () {
            console.log('Stream closed')
          })
          .on('end', function () {
            ctx.body = data;
            fullfill(next());
          })
      )
  );

  app.listen(config.http.port, () =>
    console.log(`Listening on port ${config.http.port}`)
  );

  return Promise.resolve({
    app,
    server,
    router,
    restricted
  });
}

/**
 * Merges two objects.
 * Overwrite all keys in a1 with the corresponding values from a2
 * @param {object} a1
 * @param {object} a2
 * @return {object} merged result
 */
function mergeDefaults(a1, a2) {
  const t = {};

  Object.keys(a1).forEach(k => (t[k] = a2[k] ? a2[k] : a1[k]));


  return Object.assign({}, a1, t);
}
