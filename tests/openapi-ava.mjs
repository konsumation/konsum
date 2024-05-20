import test from "ava";
import { fileURLToPath } from "node:url";
import { allContexts } from "./helpers/server.mjs";
import { loadOpenAPI, openapiPathTest } from "ava-openapi";

export async function openapiPathTestAllContexts(t, ...args) {
  t.context.parameters = parameters;

  await loadOpenAPI(
    t,
    fileURLToPath(
      new URL(
        "../node_modules/@konsumation/openapi/openapi/openapi.json",
        import.meta.url
      )
    )
  );

  for await (const context of allContexts(
    t.context,
    undefined,
    fileURLToPath(
      new URL(
        "../node_modules/@konsumation/db-test/src/fixtures/database-version-3.txt",
        import.meta.url
      )
    )
  )) {
    await openapiPathTest(t, ...args);
  }
}

openapiPathTestAllContexts.title = openapiPathTest.title;

const parameters = {
  category: "CAT-0",
  meter: "M-0",
  date: "2020-07-31T07:49:58.000Z"
};

test.serial(openapiPathTestAllContexts, "/authenticate", {
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

test.serial(openapiPathTestAllContexts, "/state", {
  get: {
    200: { version: "1.2.3", database: { schemaVersion: "3" } }
  }
});

test.serial(openapiPathTestAllContexts, "/category");

test.serial(openapiPathTestAllContexts, "/category/{category}", {
  put: {
    request: { body: { unit: "m3" } }
  },
  post: {
    request: { body: { description: "post" } }
  }
});

test.serial(
  openapiPathTestAllContexts,
  /\/category\/{category}\/(value|meter|note)$/
);

test.serial(openapiPathTestAllContexts, "/category/{category}/meter/{meter}", {
  put: {
    200: { request: { body: { unit: "m3" } } }
  },
  post: {
    200: { request: { body: { description: "post" } } }
  }
});

test.serial(
  openapiPathTestAllContexts,
  /\/category\/{category}(\/meter\/{meter})?\/value\/{date}/,
  {
    put: {
      200: { request: { body: { value: 1.23 } } }
    }
  }
);

test.serial(
  openapiPathTestAllContexts,
  /\/category\/{category}\/meter\/{meter}\/(note|value)$/,
  {}
);

test.serial(openapiPathTestAllContexts, "/admin/backup", {
  get: {
    200: `schemaVersion=3
  
  `
  },
  post: {
    200: "backup to /tmp/konsum.txt..."
  }
});

test.serial(openapiPathTestAllContexts, /\/admin\/(?!backup)/);
