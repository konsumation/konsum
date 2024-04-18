import test from "ava";
import got from "got";
import { startServer, stopServer } from "./helpers/server.mjs";

let port = 3169;

test.beforeEach(t => startServer(t, port++));
test.afterEach.always(t => stopServer(t));

test("server can authenticate", async t => {
  const response = await got.post(
    `http://localhost:${t.context.port}/authenticate`,
    {
      json: {
        username: "admin",
        password: "start123"
      }
    }
  );

  t.is(response.statusCode, 200);
  t.truthy(JSON.parse(response.body).access_token.length > 10);
});

test("fails with invalid credentials", async t => {
  try {
    const response = await got.post(
      `http://localhost:${t.context.port}/authenticate`,
      {
        json: {
          username: "admin",
          password: "wrong"
        }
      }
    );
  } catch (error) {
    t.is(error.response.statusCode, 401);
  }
});
