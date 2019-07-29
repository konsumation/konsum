import { createServer as httpCreateServer } from "http";
import { createServer as httpsCreateServer } from "https";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import bodyParser from "koa-bodyparser";
import { Category } from "konsum-db";

export const defaultHttpServerConfig = {
  http: {
    port: "${first(env.PORT,12345)}",
    auth: {
      jwt: {
        options: {
          algorithm: "RS256",
          expiresIn: "12h"  
        }
      }
    }
  }
};

export async function prepareHttpServer(config, sd, db) {
  const app = new Koa();
  // if there is a cert configured use https, otherwise plain http

  app.use(bodyParser());

  const server = config.http.cert
    ? httpsCreateServer(config.http, app.callback())
    : httpCreateServer(app.callback());
  server.on("error", err => console.log(err));
  const router = Router();

  /**
   * login to request api token
   */
  router.addRoute("POST", "/authenticate", (ctx, next) => {
    const q = ctx.request.body;

    const user = config.users[q.username];

    if (user !== undefined && user.password === q.password) {
      const claims = {
        permissions: user.roles.join(","),
        iss: "http://myDomain"
      };

      const token = jsonwebtoken.sign(
        claims,
        config.http.auth.jwt.private,
        config.http.auth.jwt.options
      );

      ctx.status = 200;
      ctx.body = {
        token,
        message: "Successfully logged in!",
        version: config.version
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
    secret: config.http.auth.jwt.public,
    debug: true
  });

  router.addRoute("GET", "/categories", restricted, async (ctx, next) => {
    const cs = [];

    for await (const c of Category.entries(db)) {
      cs.push(c.toJSON());
    }

    ctx.body = cs;
    return next();
  });

  router.addRoute(
    "GET",
    "/category/:category/values",
    restricted,
    async (ctx, next) => {
      const c = await Category.entry(db,ctx.params.category);

      const values = [];

      for await (const { value, time } of c.values(db)) {
        values.push({ value, time });
      }
    
      ctx.body = values;
      return next();
    }
  );

  router.addRoute(
    "POST",
    "/category/:category/insert",
    restricted,
    async (ctx, next) => {
      const c = await Category.entry(db,ctx.params.category);

      const q = ctx.request.body;

      time = q.time === undefined ? Date.now() : (new Date(q.time)).valueOf();

      time = time / 1000;

      await c.writeValue(database, q.value, time);
    
      ctx.body = { message: "inserted"};
      return next();
    }
  );

  const listener = app.listen(config.http.port, () => {
    console.log("listen on", listener.address());
    sd.notify("READY=1\nSTATUS=running");
  });

  return {
    app,
    server,
    router,
    restricted
  };
}
