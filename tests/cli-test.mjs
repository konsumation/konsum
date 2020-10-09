import test from 'ava';
import execa from "execa";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

test('cli version', async t => {
  const p = await execa(join(here, '..', 'src', 'konsum-cli.mjs'), ['--config', join(here, '..', 'config'), '--version'], { cwd: join(here, '..', 'build') });

  t.regex(p.stdout, /\d+/);
});
