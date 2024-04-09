import test from "ava";
import { fileURLToPath } from "node:url";
import { startServer, stopServer } from "./helpers/server.mjs";
import { loadOpenAPI, openapiPathTest } from "./helpers/openapi.mjs";

test.before(async t => {
  await startServer(t, 3190);
  await loadOpenAPI(
    t,
    fileURLToPath(
      new URL(
        "../node_modules/@konsumation/openapi/openapi/openapi.json",
        import.meta.url
      )
    )
  );
});

test.after(t => stopServer(t));

test(openapiPathTest, "/authenticate", {
  post: { username: "xadmin", password: "start123" },
  response: {
    // 200: { token_type: 'bearer' },
    401: "Authentication failed"
  }
});

test(openapiPathTest, "/state", {
  200: { version: "1.2.3", database: { schemaVersion: "3" } }
});

test(openapiPathTest, "/category", {
  200: []
});

test(openapiPathTest, "/category/{category}/meter", {
  404: "No such category"
});

test(openapiPathTest, "/category/{category}/meter/{meter}/note", {
  404: "No such category or meter"
});

test(openapiPathTest, "/category/{category}/meter/{meter}/value", {
  404: "No such category or meter"
});

test.skip(openapiPathTest, "/admin/backup", {
  200: "backup to /tmp/konsum.txt..."

  /*    200: `schemaVersion=1

`*/
  /*
  response: {
    200: "backup to /tmp/konsum.txt..."
  }
  */
});

test.skip(openapiPathTest, "/admin/backup", {
  get: {},
  response: {
    200: `schemaVersion=2

`
  }
});

test(openapiPathTest, "/admin/reload", {
  403: "missing konsum.admin.reload"
});

test(openapiPathTest, "/admin/stop", {
  403: "missing konsum.admin.stop"
});
