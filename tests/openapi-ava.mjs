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
  post: [
    {
      data: { username: "admin", password: "start123" }
    }
    /* {
      data: { username: "admin", password: "wrong" },
      401: "Authentication failed"
    }*/
  ]
});

test(openapiPathTest, "/state", {
  get: {
    200: { version: "1.2.3", database: { schemaVersion: "3" } }
  }
});

test(openapiPathTest, "/category", {});

test.skip(openapiPathTest, "/category/{category}/meter", {
  get: {
    200: { parameters: { category: "CAT-1" }},
    404: "No such category"
  }
});

test.skip(openapiPathTest, "/category/{category}/meter/{meter}/note", {
  get: {
    404: "No such category or meter"
  }
});

test.skip(openapiPathTest, "/category/{category}/meter/{meter}/value", {
  get: {
    404: "No such category or meter"
  }
});

test(openapiPathTest, "/admin/backup", {
  get: {
    200: `schemaVersion=3
  
  `
  },
  post: {
    200: "backup to /tmp/konsum.txt..."
  }
});

test.skip(openapiPathTest, "/admin/reload", {
  get: {
    403: "missing konsum.admin.reload"
  }
});

test.skip(openapiPathTest, "/admin/stop", {
  get: {
    403: "missing konsum.admin.stop"
  }
});
