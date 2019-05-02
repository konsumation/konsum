import test from "ava";
import { readFileSync } from "fs";
import got from "got";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { prepareHttpServer } from "../src/http.mjs";
import { prepareDatabase } from "../src/database.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function setPort(config, port) {
  config = Object.assign({}, config);
  config.http = Object.assign({}, config.http);
  config.http.port = port;
  return config;
}

const sd = { notify: (...args) => console.log(...args), listeners: () => [] };

const config = {
  version: "1.2.3",
  database: {
    path: "db"
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
        private: readFileSync(join(here, "..", "config", "demo.rsa"))
      }
    }
  }
};

test("server can authenticate", async t => {
  const { server } = await prepareHttpServer(setPort(config, 12345), sd);

  server.listen();

  const response = await got.post("http://localhost:12345/authenticate", {
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
  const { server } = await prepareHttpServer(setPort(config, 12346), sd);

  server.listen();

  try {
    const response = await got.post("http://localhost:12346/authenticate", {
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
  const { server } = await prepareHttpServer(
    setPort(config, 12347),
    sd,
    await prepareDatabase(config)
  );

  server.listen();

  let response = await got.post("http://localhost:12347/authenticate", {
    body: {
      username: "admin",
      password: "start123"
    },
    json: true
  });
  const token = response.body.token;

  response = await got.get("http://localhost:12347/values", {
    headers: { Authorization: `Bearer ${token}` }
  });

  t.deepEqual(JSON.parse(response.body), [{ a: 1 }, { b: 2 }]);
});
