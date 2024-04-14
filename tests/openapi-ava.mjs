import test from "ava";
import { fileURLToPath } from "node:url";
import { startServer, stopServer } from "./helpers/server.mjs";
import { loadOpenAPI, openapiPathTest } from "./helpers/openapi.mjs";

test.before(async t => {
  await startServer(
    t,
    3190,
    undefined,
    fileURLToPath(
      new URL(
        "../node_modules/@konsumation/db-test/src/fixtures/database-version-3.txt",
        import.meta.url
      )
    )
  );
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
      request: { body: { username: "admin", password: "start123" } }
    }
    /* {
      request: { body: { username: "admin", password: "wrong" }},
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

test.skip(openapiPathTest, "/category/{category}", {
  get: {
    parameters: { category: "CAT-0" }
  },
  put: {
    parameters: { category: "CAT-0" }
  },
  post: {
    parameters: { category: "CAT-0" }
  },
  delete: {
    parameters: { category: "CAT-0" }
  }
});

test(openapiPathTest, "/category/{category}/meter", {
  get: {
    parameters: { category: "CAT-0" }
  }
});

test.skip(openapiPathTest, "/category/{category}/meter/{meter}/note", {
  get: {
    parameters: { category: "CAT-0", meter: "M1" }
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
