import { createWriteStream } from "node:fs";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import ms from "ms";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import BodyParser from "koa-bodyparser";
import { Category, Meter, Note } from "@konsumation/db";
import { authenticate } from "./auth.mjs";

export const defaultHttpServerConfig = {
  http: {
    port: "${first(env.PORT,12345)}"
  }
};

function setNoCacheHeaders(ctx) {
  ctx.set("Cache-Control", "no-cache");
}

function enshureEntitlement(ctx, entitlement) {
  const user = ctx.state.user;

  if (user) {
    if (user.entitlements.indexOf(entitlement) >= 0) {
      return true;
    }
  }

  ctx.throw(403, `missing ${entitlement}`);
}

function isTrue(v) {
  return v && v !== "false" && v != "0";
}

export async function prepareHttpServer(config, sd, master) {
  const app = new Koa();
  const router = Router();

  // middleware to restrict access to token holding requests
  const restricted = KoaJWT({
    secret: config.auth.jwt.public,
    audience: config.auth.jwt.audience
  });

  function shutdown() {
    sd.notify("STOPPING=1\nSTATUS=stopping");
    server.unref();
  }

  process.on("SIGINT", () => shutdown());

  /**
   * Stop konsum server.
   */
  router.addRoute("POST", "/admin/stop", restricted, async (ctx, next) => {
    enshureEntitlement(ctx, "konsum.admin.stop");
    shutdown();
    ctx.body = "stopping...";
    return next();
  });

  /**
   * Reload konsum systemd config.
   */
  router.addRoute("POST", "/admin/reload", restricted, async (ctx, next) => {
    enshureEntitlement(ctx, "konsum.admin.reload");
    sd.notify("RELOADING=1");
    // TODO
    return next();
  });

  /**
   * Create backup on server.
   */
  router.addRoute(
    "POST",
    "/admin/backup",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.admin.backup");

      const q = ctx.request.body;
      const name = q.filename || "/tmp/konsum.txt";

      ctx.body = `backup to ${name}...`;

      master.backup(createWriteStream(name, { encoding: "utf8" }));
      return next();
    }
  );

  /**
   * Backup data as text.
   */
  router.addRoute("GET", "/admin/backup", restricted, async (ctx, next) => {
    enshureEntitlement(ctx, "konsum.admin.backup");

    ctx.response.set("content-type", "text/plain");
    ctx.response.set(
      "Content-Disposition",
      'attachment; filename="konsum_backup.txt"'
    );
    ctx.status = 200;
    ctx.respond = false;
    await master.backup(ctx.res);
    ctx.res.end();
    return next();
  });

  /**
   * Create token.
   */
  router.addRoute("POST", "/admin/token", restricted,  BodyParser(), async (ctx, next) => {
    enshureEntitlement(ctx, "konsum.admin.token");

    console.log(ctx.request.body);

    const token = jsonwebtoken.sign(
      {
        name: "admin",
        entitlements: ["konsum.admin.backup"].join(",")
      },
      config.auth.jwt.private,
      config.auth.jwt.options
    );

    ctx.body = {
      token
    };

    return next();
  });

  /**
   * Retrieve service state.
   */
  router.addRoute("GET", "/state", async (ctx, next) => {
    setNoCacheHeaders(ctx);

    let numberOfCategories = 0;

    for await (const c of Category.entries(master.db)) {
      numberOfCategories++;
    }

    ctx.body = {
      version: config.version,
      database: { schemaVersion: master.schemaVersion },
      numberOfCategories,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    return next();
  });

  /**
   * Login to request api token.
   * At least one entitlement starting with "konsum" is required.
   */
  router.addRoute("POST", "/authenticate", BodyParser(), async (ctx, next) => {
    const q = ctx.request.body;

    let refreshTokenSequence = 1;
    const { entitlements } = await authenticate(config, q.username, q.password);

    for (const e of entitlements) {
      if (e.startsWith("konsum")) {
        const claims = {
          name: q.username,
          entitlements: [...entitlements].join(",")
        };
        if (config.auth.jwt.audience) {
          claims.audience = config.auth.jwt.audience;
        }

        const access_token = jsonwebtoken.sign(
          claims,
          config.auth.jwt.private,
          config.auth.jwt.options
        );

        const refresh_token = jsonwebtoken.sign(
          { sequence: refreshTokenSequence },
          config.auth.jwt.private,
          { ...config.auth.jwt.options, expiresIn: "90d" }
        );

        ctx.status = 200;
        ctx.body = {
          access_token,
          refresh_token,
          token_type: "bearer",
          expires_in: ms(config.auth.jwt.options?.expiresIn || "1h") / 1000
        };

        return next();
      }
    }

    ctx.throw(401, "Authentication failed");
    return next();
  });

  app.use(router.middleware());

  /**
   * Retrieve list of categories.
   */
  router.addRoute("GET", "/category", restricted, async (ctx, next) => {
    setNoCacheHeaders(ctx);
    const cs = [];

    for await (const c of Category.entries(master.db)) {
      cs.push(c.toJSON());
    }

    ctx.body = cs;
    return next();
  });

  /**
   * Add a new category.
   */
  router.addRoute(
    "PUT",
    "/category/:category",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.category.add");

      const category = new Category(
        ctx.params.category,
        master,
        ctx.request.body
      );
      await category.write(master.db);
      ctx.body = { message: "updated" };
      return next();
    }
  );

  async function withCategory(ctx, cb) {
    const c = await Category.entry(master.db, ctx.params.category);
    if (c) {
      await cb(c);
    } else {
      ctx.throw(404, "No such category");
    }
  }

  /**
   * Delete a category.
   */
  router.addRoute(
    "DELETE",
    "/category/:category",
    restricted,
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.category.delete");

      await withCategory(ctx, async category => {
        await category.delete(master.db);
        ctx.body = { message: "deleted" };
      });

      return next();
    }
  );

  /**
   * List values of a category.
   */
  router.addRoute(
    "GET",
    "/category/:category/value",
    restricted,
    async (ctx, next) => {
      await withCategory(ctx, async category => {
        setNoCacheHeaders(ctx);

        const reverse = isTrue(ctx.query.reverse);
        const limit =
          ctx.query.limit === undefined ? -1 : parseInt(ctx.query.limit, 10);
        const options = { reverse, limit };

        switch (ctx.accepts("json", "text")) {
          case "json":
            const it = category.values(master.db, options);

            const values = [];

            for await (const { value, time } of it) {
              values.push({ value, time });
            }

            ctx.body = values;
            break;

          case "text":
            ctx.response.set("content-type", "text/plain");
            ctx.body = category.readStream(master.db, options);
            break;

          default:
            ctx.throw(406, "json, or text only");
        }
      });

      return next();
    }
  );

  /**
   * Insert a value into a category.
   */
  router.addRoute(
    "POST",
    "/category/:category/value",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.value.add");

      await withCategory(ctx, async category => {
        const values = ctx.request.body;

        for (const v of Array.isArray(values) ? values : [values]) {
          const time =
            v.time === undefined ? Date.now() : new Date(v.time).valueOf();
          await category.writeValue(
            master.db,
            v.value,
            Math.round(time / 1000)
          );
        }

        ctx.body = { message: "inserted" };
      });
      return next();
    }
  );

  /**
   * Delete a value from a category.
   */
  router.addRoute(
    "DELETE",
    "/category/:category/value",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.value.delete");

      await withCategory(ctx, async category => {
        const body = ctx.request.body;
        await category.deleteValue(master.db, body.key);
        ctx.body = { message: "deleted" };
      });

      return next();
    }
  );

  for (const type of [
    { name: "meter", accessor: "meters", factory: Meter },
    { name: "note", accessor: "notes", factory: Note }
  ]) {
    /**
     * List meters/notes of a category.
     */
    router.addRoute(
      "GET",
      `/category/:category/${type.name}`,
      restricted,
      async (ctx, next) => {
        await withCategory(ctx, async category => {
          setNoCacheHeaders(ctx);

          const details = [];

          for await (const detail of category[type.accessor](master.db)) {
            details.push(detail.toJSON());
          }

          ctx.body = details;
        });

        return next();
      }
    );

    /**
     * Add a meter/note to a category.
     */
    router.addRoute(
      "PUT",
      `/category/:category/${type.name}`,
      restricted,
      BodyParser(),
      async (ctx, next) => {
        enshureEntitlement(ctx, `konsum.${type.name}.add`);
        await withCategory(ctx, async category => {
          setNoCacheHeaders(ctx);

          const body = ctx.request.body;
          const name = body.name;
          delete body.name;
          const t = new type.factory(name, category, body);
          await t.write(master.db);

          ctx.body = { message: "inserted" };
        });

        return next();
      }
    );

    /**
     * Update a meter/note.
     */
    router.addRoute(
      "POST",
      `/category/:category/${type.name}`,
      restricted,
      BodyParser(),
      async (ctx, next) => {
        enshureEntitlement(ctx, `konsum.${type.name}.modify`);
        await withCategory(ctx, async category => {
          setNoCacheHeaders(ctx);

          // TODO update type
          //category[type](database);

          ctx.body = {};
        });

        return next();
      }
    );

    /**
     * Delete a meter/note.
     */
    router.addRoute(
      "DELETE",
      `/category/:category/${type.name}`,
      restricted,
      async (ctx, next) => {
        enshureEntitlement(ctx, `konsum.${type.name}.delete`);
        await withCategory(ctx, async category => {
          setNoCacheHeaders(ctx);

          // TODO delete type
          //category[type](database);

          ctx.body = {};
        });

        return next();
      }
    );
  }

  const server = await new Promise((resolve, reject) => {
    const server = app.listen(config.http.port, error => {
      if (error) {
        sd.notify("READY=1\nERRNO=" + error);
        reject(error);
      } else {
        console.log("listen on", server.address());
        sd.notify("READY=1\nSTATUS=running");
        resolve(server);
      }
    });
  });

  return {
    app,
    server,
    router
  };
}
