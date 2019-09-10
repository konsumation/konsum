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

let _port = 3149;

function nextPort() {
  return _port++;
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
  const port = nextPort();
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

  server.unref();
});

test("fails with invalid credentials", async t => {
  const port = nextPort();
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

  server.unref();
});

async function login(t,port) {
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

test.serial("get backup", async t => {
  t.timeout(10000);

  const port = nextPort();

  const { token, server, database } = await login(t,port);

  const response = await got.get(`http://localhost:${port}/admin/backup`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  //console.log(response);
  t.log(response.body);

  t.is(response.statusCode, 200);
  //t.regex(response.body, /\d+ 77.34/);

  server.unref();
  database.close();
});

test.serial("update category", async t => {
  t.timeout(10000);

  const port = nextPort();

  const { token, server, database } = await login(t,port);

  const response = await got.put(`http://localhost:${port}/category/CAT7`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      description: 'a new Unit',
      unit: 'm3'
    },
    json: true
  });

  t.is(response.statusCode, 200);

  server.unref();
  database.close();
});

test.serial("can insert + get values", async t => {
  t.timeout(10000);

  await fs.promises.mkdir(join(here, "..", "build"), { recursive: true });

  const port = nextPort();
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

  t.is(JSON.parse(response.body)[0].value, 77.34);

  server.unref();
  database.close();
});
