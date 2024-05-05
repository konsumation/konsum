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
  t.context.databaseFile = pn(`../build/db-${port}`);
  //t.context.master = "LEVEL";
  await startServer(t, port, { "@konsumation/db-level": t.context.databaseFile })
  await exec(t, ...args);
  await stopServer(t);
  t.context.databaseFile && await rm(t.context.databaseFile, { recursive: true });

  port = port++
  //t.context.master = "POSTGRES";
  const schemaName = "testintegration"
  const sql = postgres(process.env.POSTGRES_URL);
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await sql`CREATE SCHEMA ${sql(schemaName)}`;

  await startServer(t, port, {
    "@konsumation/db-postgresql": setSchema(process.env.POSTGRES_URL, schemaName)
  })
  await exec(t, ...args);
  await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
  await sql.end();
  await stopServer(t)
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

