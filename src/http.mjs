import { createWriteStream } from "fs";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import BodyParser from "koa-bodyparser";
import { Category, backup } from "konsum-db";
import { authenticate } from "./auth.mjs";

export const defaultHttpServerConfig = {
  http: {
    port: "${first(env.PORT,12345)}"
  }
};

export async function prepareHttpServer(config, sd, database, meta) {
  const app = new Koa();

  const router = Router();

  // middleware to restrict access to token holding requests
  const restricted = KoaJWT({
    secret: config.auth.jwt.public
  });

  function shutdown() {
    sd.notify("STOPPING=1\nSTATUS=stopping");
    server.unref();
  }

  process.on("SIGINT", () => shutdown());

  router.addRoute("POST", "/admin/stop", async (ctx, next) => {
    shutdown();
    ctx.body = "stopping...";
    return next();
  });

  router.addRoute("POST", "/admin/backup", restricted, BodyParser(), async (ctx, next) => {
    const q = ctx.request.body;
    const name = q.filename || "/tmp/konsum.txt";

    ctx.body = `backup to ${name}...`;

    backup(database, meta, createWriteStream(name, { encoding: "utf8" }));
    return next();
  });

  /**
   * login to request api token
   */
  router.addRoute("POST", "/authenticate", BodyParser(), async (ctx, next) => {
    const q = ctx.request.body;

    const { entitlements } = await authenticate(config, q.username, q.password);

    if (entitlements.has("konsum")) {
      const claims = {
        entitlements: [...entitlements].join(",")
      };

      const access_token = jsonwebtoken.sign(
        claims,
        config.auth.jwt.private,
        config.auth.jwt.options
      );

      ctx.status = 200;
      ctx.body = {
        access_token,
        message: "Successfully logged in!",
        version: config.version
      };
    } else {
      ctx.throw(401, "Authentication failed");
    }
    return next();
  });

  app.use(router.middleware());

  router.addRoute("GET", "/categories", restricted, async (ctx, next) => {
    const cs = [];

    for await (const c of Category.entries(database)) {
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
      const reverse = ctx.query.reverse ? true : false;
      const limit = ctx.query.limit === undefined ? -1 : ctx.query.limit;
      const options = { reverse, limit };

      const c = await Category.entry(database, ctx.params.category);

      switch (ctx.request.type) {
        case "application/json":
          const it = c.values(database, options);

          const values = [];

          for await (const { value, time } of it) {
            values.push({ value, time });
          }

          ctx.body = values;
          break;

        default:
          //case "text/plain":
          ctx.response.set("content-type", "text");
          ctx.body = c.readStream(database, options);
          break;
      }

      return next();
    }
  );

  router.addRoute(
    "POST",
    "/category/:category/insert",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      const c = await Category.entry(database, ctx.params.category);

      const values = ctx.request.body;

      for (const v of Array.isArray(values) ? values : [values]) {
        const time =
          v.time === undefined ? Date.now() : new Date(v.time).valueOf();
        await c.writeValue(database, v.value, time / 1000);
      }

      ctx.body = { message: "inserted" };
      return next();
    }
  );

  const server = app.listen(config.http.port, () => {
    console.log("listen on", server.address());
    sd.notify("READY=1\nSTATUS=running");
  });

  return {
    app,
    server,
    router
  };
}
