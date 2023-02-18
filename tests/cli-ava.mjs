import test from "ava";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execa } from "execa";

function pn(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

async function wait(msecs = 1000) {
  await new Promise(resolve => setTimeout(resolve, msecs));
}

test("cli version", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "--version"
  ]);
  t.regex(p.stdout, /\d+/);
});

test.serial("cli insert category", async t => {
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "restore",
    pn("fixtures/database.txt")
  ]);
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "insert",
    "CAT-0",
    "99.99"
  ]);
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "list",
    "CAT-0"
  ]);
  t.regex(p.stdout, /99.99/);
});

test.serial("cli list category", async t => {
  await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "restore",
    pn("fixtures/database.txt")
  ]);
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "list",
    "CAT-0"
  ]);
  t.regex(p.stdout, /77.34/);
});

test.serial("cli restore database", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "restore",
    pn("fixtures/database.txt")
  ]);
  t.regex(p.stdout, /database.txt restored/);
});

test.serial("cli backup database", async t => {
  await mkdir(pn("../build"), { recursive: true });
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "backup",
    pn("../build/database.txt")
  ]);
  t.regex(p.stdout, /database.txt saved/);
});

test.serial("cli backup database stdout", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "backup"
  ]);
  t.regex(p.stdout, /77.34/);
});

test.serial("cli start", async t => {
  const p = execa(pn("../src/konsum-cli.mjs"), [
    "--config",
    pn("../config"),
    "start"
  ]);
  await wait(200);
  p.cancel();
  t.true(true);
});
