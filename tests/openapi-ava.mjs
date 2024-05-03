import test from "ava";
import { fileURLToPath } from "node:url";
import { startServer, stopServer } from "./helpers/server.mjs";
import { loadOpenAPI, openapiPathTest } from "ava-openapi";

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

test.after.always(t => stopServer(t));

const parameters = {
  category: "CAT-0",
  meter: "M-0",
  date: "2020-07-31T07:49:58.000Z"
};

test(openapiPathTest, "/authenticate", {
  post: [
    {
      request: { body: { username: "admin", password: "start123" } },
      200: {}
    },
    {
      request: { body: { username: "admin", password: "wrong" } },
      401: "Authentication failed"
    }
  ]
});

test(openapiPathTest, "/state", {
  get: {
    200: { version: "1.2.3", database: { schemaVersion: "3" } }
  }
});

test(openapiPathTest, "/category");

test(openapiPathTest, "/category/{category}", {
  get: {
    parameters
  },
  put: {
    parameters,
    request: { body: { unit: "m3" } }
  },
  post: {
    parameters,
    request: { body: { description: "post" } }
  },
  delete: {
    parameters
  }
});

test(openapiPathTest, /\/category\/{category}\/(value|meter|note)$/, {
  get: {
    parameters
  }
});

test(openapiPathTest, "/category/{category}/meter/{meter}", {
  get: {
    parameters
  },
  put: {
    parameters,
    200: { request: { body: { unit: "m3" } } }
  },
  post: {
    parameters,
    200: { request: { body: { description: "post" } } }
  },
  delete: {
    parameters
  }
});

test(
  openapiPathTest,
  /\/category\/{category}(\/meter\/{meter})?\/value\/{date}/,
  {
    get: {
      parameters
    },
    put: {
      parameters,
      200: { request: { body: { value: 1.23 } } }
    },
    delete: {
      parameters
    }
  }
);

test(openapiPathTest, /\/category\/{category}\/meter\/{meter}\/(note|value)$/, {
  get: {
    parameters
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

test(openapiPathTest, /\/admin\/(?!backup)/);
