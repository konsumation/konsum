import test from "ava";
import fs, { readFileSync } from "fs";
import got from "got";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { prepareHttpServer } from "../src/http.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sd = { notify: () => {}, listeners: () => [] };

let port = 3169;

test.before(async t => {
  await fs.promises.mkdir(join(here, "..", "build"), { recursive: true });

  port++;

  const config = {
    version: "1.2.3",
    database: {
      file: join(here, "..", "build", `db-${port}`)
    },
    auth: {
      jwt: {
        public: readFileSync(join(here, "..", "config", "demo.rsa.pub")),
        private: readFileSync(join(here, "..", "config", "demo.rsa")),
        options: {
          algorithm: "RS256"
        }
      },
      users: {
        admin: {
          password: "start123",
          entitlements: ["konsum"]
        }
      }
    },
    http: {
      port
    }
  };

  const { server } = await prepareHttpServer(config, sd);

  t.context.server = server;
  t.context.port = port;
});

test.after.always(async t => {
  t.context.server.close();
  t.context.server.unref();
});

test("server can authenticate", async t => {
  const response = await got.post(
    `http://localhost:${t.context.port}/authenticate`,
    {
      body: {
        username: "admin",
        password: "start123"
      },
      json: true
    }
  );

  t.is(response.statusCode, 200);
  t.truthy(response.body.access_token.length > 10);
});

test("fails with invalid credentials", async t => {
  try {
    const response = await got.post(
      `http://localhost:${t.context.port}/authenticate`,
      {
        body: {
          username: "admin",
          password: "wrong"
        },
        json: true
      }
    );
  } catch (error) {
    t.is(error.statusCode, 401);
  }
});
