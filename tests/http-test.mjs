import test from "ava";
import fs, { readFileSync } from "fs";
import got from "got";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Category } from "konsum-db";

import { prepareHttpServer } from "../src/http.mjs";
import { prepareDatabase } from "../src/database.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function setPort(config, port) {
  config = Object.assign({}, config);
  config.http = Object.assign({}, config.http);
  config.http.port = port;
  return config;
}

const sd = { notify: () => { }, listeners: () => [] };


const config = {
  version: "1.2.3",
  database: {
    file: join(here, "..", "build", "db")
  },
  users: {
    admin: {
      password: "start123",
      roles: ["admin"]
    }
  },
  http: {
    auth: {
      jwt: {
        public: readFileSync(join(here, "..", "config", "demo.rsa.pub")),
        private: readFileSync(join(here, "..", "config", "demo.rsa")),
        options: {
          algorithm: "RS256"
        }
      }
    }
  }
};

test("server can authenticate", async t => {
  const port = 12345;
  const { server } = await prepareHttpServer(setPort(config, port), sd);

  server.listen();

  const response = await got.post(`http://localhost:${port}/authenticate`, {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });

  t.is(response.statusCode, 200);
  t.truthy(response.body.token.length > 10);
  t.is(response.body.version, "1.2.3");
});

test("fails with invalid credentials", async t => {
  const port = 12346;
  const { server } = await prepareHttpServer(setPort(config, port), sd);

  server.listen();

  try {
    const response = await got.post(`http://localhost:${port}/authenticate`, {
      body: {
        username: "admin",
        password: "wrong"
      },
      json: true
    });
  } catch (error) {
    t.is(error.statusCode, 401);
  }
});

test("can get /values", async t => {
  await fs.promises.mkdir(join(here, "..", "build"), { recursive: true });

  const port = 12347;
  const db = await prepareDatabase(config);
  const { server } = await prepareHttpServer(
    setPort(config, port),
    sd,
    db
  );

  const c = new Category(`CAT1`, { unit: "kWh" });
  await c.write(db);
  const now = Date.now();
  await c.writeValue(db, 77.34, now);


  server.listen();

  let response = await got.post(`http://localhost:${port}/authenticate`, {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });

  t.is(response.statusCode, 200);

  const token = response.body.token;

  //console.log("TOKEN", token);

  response = await got.get(`http://localhost:${port}/category/CAT1/values`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  t.log(response.body);
  t.is(JSON.parse(response.body)[0].value, 77.34);
});
