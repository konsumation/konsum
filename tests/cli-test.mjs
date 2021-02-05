import test from "ava";
import { mkdir } from "fs/promises";

import execa from "execa";

function pn(path) {
  return new URL(path, import.meta.url).pathname;
}

test("cli version", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), ["--config", pn("../config"), "--version"]);
  t.regex(p.stdout, /\d+/);
});

test("cli restore database", async t => {
  const p = await execa(pn("../src/konsum-cli.mjs"), ["--config", pn("../config"), "restore", pn("fixtures/database.txt")]);
  t.regex(p.stdout, /database.txt restored/);
});

test.skip("cli backup database", async t => {
  await mkdir(pn("../build"),{ recursive: true });
  const p = await execa(pn("../src/konsum-cli.mjs"), ["--config", pn("../config"), "backup", pn("../build/database.txt")]);
  t.regex(p.stdout, /database.txt saved/);
});
