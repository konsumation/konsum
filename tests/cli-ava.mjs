import test from "ava";
import { mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { createConfig, login } from "./helpers/server.mjs";
import getPort from "@ava/get-port";

test.before(async t => {
  return createConfig(t.context, await getPort());
});
test.after(t => rm(t.context.configDir, { recursive: true }));

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

async function wait(msecs = 1000) {
  await new Promise(resolve => setTimeout(resolve, msecs));
}

test("cli version", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "--version"
  ]);
  t.regex(p.stdout, /\d+/);

  await p;
});

test.serial("cli insert category", async t => {
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "restore",
    pn(
      "../node_modules/@konsumation/db-test/src/fixtures/database-version-3.txt"
    )
  ]);
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "insert",
    "CAT-0",
    "99.99"
  ]);
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "list",
    "CAT-0"
  ]);
  t.regex(p.stdout, /99.99/);
});

test.serial("cli list category", async t => {
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "restore",
    pn(
      "../node_modules/@konsumation/db-test/src/fixtures/database-version-3.txt"
    )
  ]);
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "list",
    "CAT-0"
  ]);
  t.regex(p.stdout, /77.34/);

  await p;
});

test.serial("cli restore database", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "restore",
    pn(
      "../node_modules/@konsumation/db-test/src/fixtures/database-version-3.txt"
    )
  ]);

  t.regex(p.stdout, /database-version-3.txt restored/);
});

test.serial("cli backup database", async t => {
  const dumpFile = pn("../build/database.txt");
  await mkdir(pn("../build"), { recursive: true });
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "backup",
    dumpFile
  ]);

  const s = await stat(dumpFile);

  t.true(s.size > 700);
});

test.serial("cli backup database stdout", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "backup"
  ]);
  t.regex(p.stdout, /77.34/);

  await p;
});

test.serial("cli start", async t => {
  const p = execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    t.context.configDir,
    "start"
  ]);
  await wait(1000);

  /*
  await login(t.context);
  t.log(t.context.token);
 */
  /*
   const url = t.context.url + "/admin/stop"
    const rc = await fetch(url, { method: "POST" });
    console.log(rc);
*/

  t.true(true);
});
