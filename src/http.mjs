import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import ms from "ms";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import BodyParser from "koa-bodyparser";
import { LevelMaster } from "@konsumation/db-level";
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

  if (user?.entitlements.indexOf(entitlement) >= 0) {
    return true;
  }

  ctx.throw(403, `missing ${entitlement}`);
}

async function lineToStream(lines) {
  const a = [];
  for await (const line of lines) {
    a.push(line);
  }
  return a.join("\n");
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

      const out = createWriteStream(name, "utf8");

      for await (const line of master.text()) {
        out.write(line + "\n");
      }

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

    for await (const line of master.text()) {
      ctx.res.write(line + "\n");
    }

    ctx.res.end();
    return next();
  });

  /**
   * Create token.
   */
  router.addRoute(
    "POST",
    "/admin/token",
    restricted,
    BodyParser(),
    async (ctx, next) => {
      enshureEntitlement(ctx, "konsum.admin.token");

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
    }
  );

  /**
   * Retrieve service state.
   */
  router.addRoute("GET", "/state", async (ctx, next) => {
    setNoCacheHeaders(ctx);

    let numberOfCategories = 0;

    for await (const c of master.categories()) {
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
    const categories = [];

    for await (const category of master.categories()) {
      categories.push(category.toJSON());
    }

    ctx.body = categories;
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
      const category = master.addCategory({
        name: ctx.params.category,
        ...ctx.request.body
      });
      await category.write(master.context);
      ctx.body = { message: "updated" };
      return next();
    }
  );

  async function withCategory(ctx, cb) {
    const category = await master.category(ctx.params.category);
    if (category) {
      await cb(category);
    } else {
      ctx.throw(404, "No such category");
    }
  }

  async function withMeter(ctx, cb) {
    const category = await master.category(ctx.params.category);
    const meter = await category?.meter(master.context, ctx.params.meter);
    if (meter) {
      await cb(meter);
    } else {
      ctx.throw(404, "No such category or meter");
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
        await category.delete(master.context);
        ctx.body = { message: "deleted" };
      });

      return next();
    }
  );

  for (const [method, config] of Object.entries({
    GET: {
      extra: [restricted],
      exec: async (ctx, meter) => (ctx.body = meter.toJSON())
    },
    PUT: {
      extra: [restricted, BodyParser()],
      exec: async (ctx, meter) => (ctx.body = meter.toJSON()) // TODO
    },
    POST: {
      extra: [restricted, BodyParser()],
      exec: async (ctx, meter) => (ctx.body = meter.toJSON()) // TODO
    }
  })) {
    router.addRoute(
      method,
      "/category/:category/meter/:meter/note",
      ...config.extra,
      async (ctx, next) => {
        await withMeter(ctx, async meter => config.exec(ctx, meter));
        return next();
      }
    );
  }

  for (const [method, config] of Object.entries({
    GET: {
      extra: [restricted],
      exec: async (ctx, master, object) => {
        setNoCacheHeaders(ctx);
        const reverse = isTrue(ctx.query.reverse);
        const limit =
          ctx.query.limit === undefined ? -1 : parseInt(ctx.query.limit, 10);
        const options = { reverse, limit };

        switch (ctx.accepts("json", "text")) {
          case "json":
            const it = object.values(master.context, options);

            const values = [];

            for await (const { value, date } of it) {
              values.push({ value, date });
            }

            ctx.body = values;
            break;

          case "text":
            ctx.response.set("content-type", "text/plain");
            ctx.body = await lineToStream(object.text(master.context));
            break;

          default:
            ctx.throw(406, "json, or text only");
        }
      }
    },
    POST: {
      extra: [restricted, BodyParser()],
      exec: async (ctx, master, object) => {
        enshureEntitlement(ctx, "konsum.value.add");
        const values = ctx.request.body;

        for (const v of Array.isArray(values) ? values : [values]) {
          await object.writeValue(
            master.context,
            v.time === undefined ? new Date() : new Date(v.time),
            v.value
          );
        }

        ctx.body = { message: "inserted" };
      }
    },
    DELETE: {
      extra: [restricted, BodyParser()],
      exec: async (ctx, master, object) => {
        enshureEntitlement(ctx, "konsum.value.delete");
        const body = ctx.request.body;
        await object.deleteValue(master.context, new Date(body.key));
        ctx.body = { message: "deleted" };
      }
    }
  })) {
    for (const [path, access] of Object.entries({
      "/category/:category/value": withCategory,
      "/category/:category/meter/:meter/value": withMeter
    })) {
      router.addRoute(method, path, ...config.extra, async (ctx, next) => {
        await access(ctx, object => config.exec(ctx, master, object));
        return next();
      });
    }
  }

  for (const type of [
    {
      name: "meter",
      accessor: "meters",
      factory: LevelMaster.factories.category.factories.meter
    },
    {
      name: "note",
      accessor: "notes",
      factory: LevelMaster.factories.category.factories.meter.factories.note
    }
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

          for await (const detail of category[type.accessor](master.context)) {
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
          body.category = category;
          const t = new type.factory(body);
          await t.write(master.context);

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
