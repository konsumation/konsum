import { createServer as httpCreateServer } from "http";
import { createServer as httpsCreateServer } from "https";
import Koa from "koa";
import jsonwebtoken from "jsonwebtoken";
import KoaJWT from "koa-jwt";
import Router from "koa-better-router";
import bodyParser from "koa-bodyparser";
import Client from "ldapts";
import { Category } from "konsum-db";

export const defaultHttpServerConfig = {
  ldap: {
    url: "ldap://ldap.mf.de",
    bindDN: "uid={{user}},ou=accounts,dc=mf,dc=de",
    roles: {
      base: "ou=groups,dc=mf,dc=de",
      filter: "(&(objectclass=groupOfUniqueNames)(uniqueMember=uid={{user}},ou=accounts,dc=mf,dc=de))"
    }
  },
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
  router.addRoute("POST", "/authenticate", async (ctx, next) => {
    const q = ctx.request.body;

    let isAuthenticated = false;
    let roles = [];

    if (config.ldap) {
      const client = new Client({
        url: config.ldap.url
      });

      function inject(str)
      {
        return str.replace(/\{\{user\}\}/, q.username);
      }

      try {
        await client.bind(inject(config.ldap.bindDN), q.password);
        isAuthenticated = true;

        const {
          searchEntries,
          searchReferences,
        } = await client.search(inject(config.ldap.roles.base), {
          scope: 'sub',
          filter: inject(config.ldap.roles.filter)
        });
        console.log(searchEntries);
        console.log(searchReferences);
      } catch (ex) {
        console.log(ex);
      } finally {
        await client.unbind();
      }

      console.log(bindDN, isAuthenticated);
    }

    if (config.users) {
      const user = config.users[q.username];
      if (user !== undefined && user.password === q.password) {
        isAuthenticated = true;
        roles = user.roles;
      }
    }

    if (isAuthenticated) {
      const claims = {
        permissions: roles.join(","),
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
