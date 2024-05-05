import test from "ava";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import { setSchema } from "@konsumation/db-postgresql";
import { startServer, stopServer } from "./helpers/server.mjs";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

let port = 3500;

async function allDatabases(t, exec, ...args) {

  port = port++
  const databaseFile = pn(`../build/db-${port}`);
  await startServer(t, port, { "@konsumation/db-level": databaseFile })
  await exec(t, ...args);
  await stopServer(t);
  await rm(databaseFile, { recursive: true });

  port = port++
  const schemaName = "testintegration"
  const sql = postgres(process.env.POSTGRES_URL);
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await sql`CREATE SCHEMA ${sql(schemaName)}`;

  await startServer(t, port, {
    "@konsumation/db-postgresql": setSchema(process.env.POSTGRES_URL, schemaName)
  })
  await exec(t, ...args);
  await stopServer(t)
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await sql.end();
  //t.context = {}
}

allDatabases.title = (providedTitle = "databases") =>
  `${providedTitle}`.trim();

test.serial("check constructor1", allDatabases, async t => {
  //t.log("########", t.context.master.constructor.name);
  t.true(t.context.master.constructor.name === "level" || t.context.master.constructor.name === "postgresql");
});

test.serial("check constructor2", allDatabases, async t => {
  //t.log("########", t.context.master.constructor.name);
  t.true(t.context.master.constructor.name === "level" || t.context.master.constructor.name === "postgresql");
});

