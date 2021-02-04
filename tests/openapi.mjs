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

async function assertPath(t, path) {
  const p = t.context.api.paths[path];
  t.truthy(p, `does not exists in api: ${path}`);

  for (const [emn, em] of Object.entries(p)) {
    switch (emn) {
      case "get":
        for (const [erc, er] of Object.entries(em.responses)) {
          const response = await got.get(`${t.context.url}${path}`);
          t.is(response.statusCode, parseInt(erc), "${path}");
        }
        break;
    }
  }
}

async function openapiPathTest(t, path) {
  await assertPath(t, path);
}

openapiPathTest.title = (providedTitle = "openapi", path) =>
  `${providedTitle} ${path}`.trim();

test(openapiPathTest, "/state");
//test(openapiPathTest, "/admin/backup");
