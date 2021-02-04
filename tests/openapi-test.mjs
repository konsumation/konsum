import test from "ava";
import { readFile } from "fs/promises";
import { startServer, stopServer } from "./helpers/server.mjs";
import got from "got";

test.before(async t => {
  await startServer(t, 3190);
  t.context.api = JSON.parse(
    await readFile(
      new URL("../openapi/openapi.json", import.meta.url).pathname,
      { encoding: "utf8" }
    )
  );
});
test.after(t => stopServer(t));

async function assertPath(t, path, expected) {
  const p = t.context.api.paths[path];
  t.truthy(p, `Does not exists in api: ${path}`);

  for (const [emn, em] of Object.entries(p)) {
    switch (emn) {
      case "get":
        for (const [erc, er] of Object.entries(em.responses)) {
          try {
            const response = await got.get(`${t.context.url}${path}`, {
              headers: { Authorization: `Bearer ${t.context.token}` }
            });

            t.is(response.statusCode, parseInt(erc), "${path}");

            for (const [ct, c] of Object.entries(er.content)) {
              switch (ct) {
                case "application/json":
                  const body = JSON.parse(response.body);
                  t.like(body, expected[erc]);
                  break;
                case "application/text":
                  t.is(response.body, expected[erc]);
                  break;

                default:
                  t.log(`Unknown content type ${ct}`);
              }
            }
          } catch (e) {
            const response = e.response;
            t.deepEqual(response.body, expected[response.statusCode]);
          }
        }
        break;
    }
  }
}

async function openapiPathTest(t, path, expected) {
  await assertPath(t, path, expected);
}

openapiPathTest.title = (providedTitle = "openapi", path, expected) =>
  `${providedTitle} ${path}`.trim();

test(openapiPathTest, "/state", {
  200: { version: "1.2.3", database: { schemaVersion: "1" } }
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
