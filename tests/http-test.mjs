import test from "ava";
import { readFileSync } from "fs";
import got from "got";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { prepareHttpServer } from "../src/http";
//import { prepareDatabase } from "../src/database";

const here = dirname(fileURLToPath(import.meta.url));

function setPort(config, port) {
  config = Object.assign({}, config);
  config.http = Object.assign({}, config.http);
  config.http.port = port;
  return config;
}

const config = {
  database: {
    path: "level.db"
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

test("server can /login", async t => {
  const { app, server } = await prepareHttpServer(setPort(config, 12345));

  server.listen();

  const response = await got(
    "http://localhost:12345/login?user=admin&password=start123"
  );

  t.is(response.statusCode, 200);
});

test("fails with invalid credentials /login", async t => {
  const { app, server } = await prepareHttpServer(setPort(config, 12346));

  server.listen();

  try {
    const response = await got(
      "http://localhost:12346/login?user=admin&password=unknown"
    );
  } catch (error) {
    t.is(error.statusCode, 401);
  }
});

/*
  const database = await prepareDatabase(config);

  it('can get /values', () =>
    prepareHttpServer(setPort(config, 12347), database).then(
      ({ app, server }) => {
        const r = request(server.listen());
        return r.get('/login?user=admin&password=start123').then(res => {
          const token = res.body.token;
          //console.log(token);
          return r
            .get('/values?jwt=' + token)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              console.log(res.body);
              return expect(res).to.have.status(200);
            });
        });
      }
    ));
});
*/
