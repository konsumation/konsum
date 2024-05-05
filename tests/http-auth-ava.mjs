import test from "ava";
import got from "got";
import { execAllContexts } from "./helpers/server.mjs";

test.serial("server can authenticate", execAllContexts, async t => {
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

test.serial("fails with invalid credentials", execAllContexts, async t => {
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
