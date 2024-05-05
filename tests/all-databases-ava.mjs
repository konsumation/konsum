import test from "ava";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import { setSchema } from "@konsumation/db-postgresql";
import { startServer, stopServer } from "./helpers/server.mjs";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

async function allDatabases(t, title, exec) {

  let port = 3500;
  port = port++
  t.context.databaseFile = pn(`../build/db-${port}`);
  //t.context.master = "LEVEL";
  await startServer(t, port, { "@konsumation/db-level": t.context.databaseFile })
  await exec(t);
  await stopServer(t);
  t.context.databaseFile &&
    await rm(t.context.databaseFile, { recursive: true });


  //t.context.master = "POSTGRES";
  const schemaName = "testintegration"
  await startServer(t, port++, {
    "@konsumation/db-postgresql": setSchema(process.env.POSTGRES_URL, schemaName)
  })

  const sql = t.context.master.context;
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await sql`CREATE SCHEMA ${sql(schemaName)}`;
  await exec(t);
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await stopServer(t)
}

allDatabases.title = (providedTitle = "databases",) =>
  `${providedTitle}`.trim();

test(allDatabases, "list categories", async t => {
  //t.log("########", t.context.master.constructor.name);
  t.true(t.context.master.constructor.name === "level" || t.context.master.constructor.name === "postgresql");
});
