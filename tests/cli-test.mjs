import test from 'ava';
import execa from "execa";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

test('cli', async t => {
  const p = await execa(join(here,'..','bin','konsum'));

  t.truthy(p);
});
