import { createWriteStream } from "node:fs";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import ms from "ms";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import BodyParser from "koa-bodyparser";
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
    ctx.body = "reload...";
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

    let categories = 0;

    for await (const c of master.categories()) {
      categories++;
    }

    ctx.body = {
      version: config.version,
      database: { schemaVersion: master.schemaVersion },
      statistics: { categories },
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
        const jwt = config.auth.jwt;

        const claims = {
          name: q.username,
          entitlements: [...entitlements].join(",")
        };
        if (jwt.audience) {
          claims.audience = jwt.audience;
        }

        const access_token = jsonwebtoken.sign(
          claims,
          jwt.private,
          jwt.options
        );

        const refresh_token = jsonwebtoken.sign(
          { sequence: refreshTokenSequence },
          jwt.private,
          { ...jwt.options, expiresIn: "90d" }
        );

        ctx.status = 200;
        ctx.body = {
          access_token,
          refresh_token,
          token_type: "bearer",
          expires_in: Number(ms(jwt.options?.expiresIn || "1h")) / 1000
        };

        return next();
      }
    }

    ctx.throw(401, "Authentication failed");
    return next();
  });

  app.use(router.middleware());

  function reportAction(ctx, object, verb) {
    switch (ctx.accepts("json", "text")) {
      case "json":
        ctx.body = { message: verb };
        break;
      default:
        ctx.body = verb;
    }
  }

  const typeDefinitions = {
    category: {
      parameter: "category",
      paths: ["/category"]
    },
    meter: {
      parameter: "meter",
      paths: ["/category/:category/meter"]
    },
    note: {
      parameter: "note",
      paths: [
        "/category/:category/note",
        "/category/:category/meter/:meter/note"
      ]
    },
    value: {
      parameter: "date",
      paths: [
        "/category/:category/value",
        "/category/:category/meter/:meter/value"
      ]
    }
  };

  const context = master.context;

  for (const [type, typeDefinition] of Object.entries(typeDefinitions)) {
    for (const path of typeDefinition.paths) {
      router.addRoute("GET", path, restricted, async (ctx, next) => {
        setNoCacheHeaders(ctx);

        const options = {
          reverse: isTrue(ctx.query.reverse),
          limit: parseInt(ctx.query.limit, 10) || -1
        };

        const query = { ...ctx.params, [typeDefinition.parameter]: "*" };

        switch (ctx.accepts("json", "text")) {
          case "json":
            try {
              const objects = [];
              for await (const object of master.all(query, options)) {
                objects.push(object.toJSON());
              }
              ctx.body = objects;
            } catch (e) {
              if (e.category || e.meter) {
                ctx.throw(404, `No such ${type} ${e.category || e.meter}`);
              }
            }
            break;

          case "text":
            const lines = [];

            for await (const object of master.all(query, options)) {
              for await (const line of object.text(context)) {
                lines.push(line);
              }
            }
            ctx.body = lines.join("\n");
            break;

          case false:
            ctx.throw(406, "only json and text");
        }

        return next();
      });

      for (const [method, config] of Object.entries({
        GET: {
          entitlement: "get",
          exec: async (ctx, master) => {
            const object = await master.one(ctx.params);

            if (object) {
              switch (ctx.accepts("json", "text")) {
                case "json":
                  ctx.body = object.toJSON();
                  break;
                case "text":
                  const lines = [];
                  for await (const line of object.text(context)) {
                    lines.push(line);
                  }
                  ctx.body = lines.join("\n");
                  break;
                case false:
                  ctx.throw(406, "only json and text");
                  break;
              }
            } else {
              ctx.throw(404, `No such ${type}`);
            }
          }
        },
        PUT: {
          entitlement: "add",
          extra: [BodyParser()],
          exec: async (ctx, master) => {
            const name = ctx.params[typeDefinition.parameter];
            delete ctx.params[typeDefinition.parameter];
            const factory = master.factories[type];

            let parent;
            if (factory.parentType) {
              parent = await master.one(ctx.params);
              if (parent && parent.type !== factory.parentType) {
                parent = await parent.activeMeter(context, true); // TODO move into Value write
              }

              if (!parent) {
                ctx.throw(404, `No such ${factory.parentType}`);
              }
            }

            const object = new factory({
              name,
              ...ctx.request.body,
              [parent?.type]: parent
            });

            await object.write(context);
            reportAction(ctx, object, "added");
          }
        },
        POST: {
          entitlement: "modify",
          extra: [BodyParser()],
          exec: async (ctx, master) => {
            const object = await master.one(ctx.params);
            if (object) {
              await object.write(context);
              reportAction(ctx, object, "modified");
            } else {
              ctx.throw(404, `No such ${type}`);
            }
          }
        },
        DELETE: {
          entitlement: "delete",
          exec: async (ctx, master) => {
            const object = await master.one(ctx.params);

            if (object) {
              await object.delete(context);
              reportAction(ctx, object, "deleted");
            } else {
              ctx.throw(404, `No such ${type}`);
            }
          }
        }
      })) {
        const extra = [restricted];
        if (config.extra) {
          extra.push(...config.extra);
        }

        router.addRoute(
          method,
          `${path}/:${typeDefinition.parameter}`,
          extra,
          async (ctx, next) => {
            //  enshureEntitlement(ctx, `konsum.${type}.${config.entitlement}`);
            setNoCacheHeaders(ctx);
            await config.exec(ctx, master);
            return next();
          }
        );
      }
    }
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
