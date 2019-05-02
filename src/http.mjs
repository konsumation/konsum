import { createServer as httpCreateServer } from "http";
import { createServer as httpsCreateServer } from "https";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import bodyParser from "koa-bodyparser";
import { Category } from "konsum-db";

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
        config.http.auth.jwt
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
    secret: config.http.auth.jwt.public
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
    "/values",
    restricted,
    (ctx, next) => {
      ctx.body = [{ a: 1 }, { b: 2 }];
      return next();
    }

    /*
      new Promise((resolve, reject) =>
        db
          .createReadStream()
          .on("data", data => {
            console.log(data.key, "=", data.value);
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
            resolve(next());
          })
      )
      */
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
