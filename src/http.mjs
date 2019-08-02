import { createServer as httpCreateServer } from "http";
import { createServer as httpsCreateServer } from "https";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import bodyParser from "koa-bodyparser";
import { Category } from "konsum-db";
import { authenticate } from "./auth.mjs";

export const defaultHttpServerConfig = {
  http: {
    port: "${first(env.PORT,12345)}"
  }
};

export async function prepareHttpServer(config, sd, db) {
  const app = new Koa();
  // if there is a cert configured use https, otherwise plain http

  const server = config.http.cert
    ? httpsCreateServer(config.http, app.callback())
    : httpCreateServer(app.callback());
  server.on("error", err => console.log(err));
  const router = Router();

  router.addRoute("POST", "/admin/stop", async (ctx, next) => {
    sd.notify("STOPPING=1");
    ctx.body = "stopping...";
    process.nextTick(() => process.exit(0));
    return next();
  });

  /**
   * login to request api token
   */
  router.addRoute("POST", "/authenticate", bodyParser(), async (ctx, next) => {
    const q = ctx.request.body;

    const { entitlements } = await authenticate(config, q.username, q.password);

    if (entitlements.has("konsum")) {
      const claims = {
        entitlements: [...entitlements].join(",")
      };

      const token = jsonwebtoken.sign(
        claims,
        config.auth.jwt.private,
        config.auth.jwt.options
      );

      ctx.status = 200;
      ctx.body = {
        token,
        message: "Successfully logged in!",
        version: config.version
      };
    } else {
      ctx.throw(401, "Authentication failed");
    }
    return next();
  });

  app.use(router.middleware());

  // middleware to restrict access to token holding requests
  const restricted = KoaJWT({
    secret: config.auth.jwt.public,
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
      const c = await Category.entry(db, ctx.params.category);

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
    bodyParser(),
    async (ctx, next) => {
      const c = await Category.entry(db, ctx.params.category);

      const values = ctx.request.body;

      for (const v of Array.isArray(values) ? values : [values]) {
        const time =
          v.time === undefined ? Date.now() : new Date(v.time).valueOf();
        await c.writeValue(db, v.value, time / 1000);
      }

      ctx.body = { message: "inserted" };
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
