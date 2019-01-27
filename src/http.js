import { createServer as httpCreateServer } from "http";
import { createServer as httpsCreateServer } from "https";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import { parse } from "querystring";
import {} from "systemd";

export function prepareHttpServer(config, database) {
  const app = new Koa();
  // if there is a cert configured use https, otherwise plain http
  const server = config.http.cert
    ? httpsCreateServer(config.http, app.callback())
    : httpCreateServer(app.callback());
  server.on("error", err => console.log(err));
  const router = Router();

  /**
   * login to request api token
   */
  router.addRoute("GET", "/login", (ctx, next) => {
    const q = parse(ctx.request.querystring);
    const user = config.users[q.user];

    if (user !== undefined && user.password === q.password) {
      const claims = {
        permissions: user.roles.join(","),
        iss: "http://myDomain"
      };

      const token = jsonwebtoken.sign(
        claims,
        config.http.auth.jwt.private,
        mergeDefaults(
          {
            algorithm: "RS256",
            expiresIn: "12h"
          },
          config.http.auth.jwt
        )
      );

      ctx.status = 200;
      ctx.body = {
        token,
        message: "Successfully logged in!"
      };
    } else {
      ctx.status = 401;
      ctx.body = {
        message: "Authentication failed"
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
    "GET",
    "/values",
    /*restricted,*/ (ctx, next) =>
      new Promise((fullfill, reject) =>
        database
          .createReadStream()
          .on("data", data => {
            console.log(data.key, "=", data.value);
            console.log('data.key, "=", data.value');
            ctx.body = Object.assign(ctx.body, data);
          })
          .on("error", err => {
            ctx.status = 401;
            ctx.body = err;
            reject(err);
          })
          .on("close", () => {
            console.log("Stream closed");
          })
          .on("end", () => {
            console.log("Stream ended");
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
 * @param {Object} a1
 * @param {Object} a2
 * @return {Object} merged result
 */
function mergeDefaults(a1, a2) {
  const t = {};

  Object.keys(a1).forEach(k => (t[k] = a2[k] ? a2[k] : a1[k]));

  return Object.assign({}, a1, t);
}
