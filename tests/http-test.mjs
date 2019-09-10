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

const sd = { notify: () => {}, listeners: () => [] };

const config = {
  version: "1.2.3",
  database: {
    file: join(here, "..", "build", "db")
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
  http: {}
};

test("server can authenticate", async t => {
  const port = 12345;
  const { server } = await prepareHttpServer(setPort(config, port), sd);

  const response = await got.post(`http://localhost:${port}/authenticate`, {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });

  t.is(response.statusCode, 200);
  t.truthy(response.body.access_token.length > 10);
});

test("fails with invalid credentials", async t => {
  const port = 12346;
  const { server } = await prepareHttpServer(setPort(config, port), sd);

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

async function login(port) {
  const { database, meta } = await prepareDatabase(config);
  const { server } = await prepareHttpServer(
    setPort(config, port),
    sd,
    database,
    meta
  );

  let response = await got.post(`http://localhost:${port}/authenticate`, {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });

  const token = response.body.access_token;

  return { database, server, token };
}

test("get backup", async t => {
  const port = 12348;

  const { token } = await login(port);

  const response = await got.get(`http://localhost:${port}/admin/backup`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  //console.log(response);
  t.log(response.body);

  t.is(response.statusCode, 200);
  //t.regex(response.body, /\d+ 77.34/);
});

test("can insert + get values", async t => {
  await fs.promises.mkdir(join(here, "..", "build"), { recursive: true });

  const port = 12347;
  const { database } = await prepareDatabase(config);
  const { server } = await prepareHttpServer(
    setPort(config, port),
    sd,
    database
  );

  const c = new Category(`CAT1`, { unit: "kWh" });
  await c.write(database);
  const now = Date.now();
  await c.writeValue(database, 77.34, now);

  let response = await got.post(`http://localhost:${port}/authenticate`, {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });

  t.is(response.statusCode, 200);

  const token = response.body.access_token;

  response = await got.post(`http://localhost:${port}/category/CAT1/insert`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      value: 78.0
    },
    json: true
  });

  response = await got.get(`http://localhost:${port}/category/CAT1/values`, {
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${token}`
    }
  });
  t.log(response.body);
  t.regex(response.body, /\d+ 77.34/);
  t.regex(response.body, /\d+ 78/);

  response = await got.get(`http://localhost:${port}/category/CAT1/values`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  //t.log(response.body);
  t.is(JSON.parse(response.body)[0].value, 77.34);
});
