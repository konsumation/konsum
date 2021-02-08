import test from "ava";
import { startServer, stopServer } from "./helpers/server.mjs";
import { loadOpenAPI, openapiPathTest } from "./helpers/openapi.mjs";

test.before(async t => {
  await startServer(t, 3190);
  await loadOpenAPI(
    t,
    new URL("../openapi/openapi.json", import.meta.url).pathname
  );
});

test.after(t => stopServer(t));

test(openapiPathTest, "/authenticate", {
  post: { username: "admin", password: "start123" },
  response: {
    401: "Authentication failed"
  }
});

test(openapiPathTest, "/state", {
  200: { version: "1.2.3", database: { schemaVersion: "1" } }
});

test(openapiPathTest, "/category", {
  200: []
});

test(openapiPathTest, "/category/{category}/meter", {
  404: "No such category"
});

test(openapiPathTest, "/category/{category}/note", {
  404: "No such category"
});

test(openapiPathTest, "/category/{category}/value", {
  404: "No such category"
});

test(openapiPathTest, "/admin/backup", {
  200: `schemaVersion=1

`
});

test(openapiPathTest, "/admin/reload", {
  403: "missing konsum.admin.reload"
});

test(openapiPathTest, "/admin/stop", {
  403: "missing konsum.admin.stop"
});
