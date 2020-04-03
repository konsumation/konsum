import { readFileSync } from "fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import consts from "rollup-plugin-consts";

import executable from "rollup-plugin-executable";
import cleanup from "rollup-plugin-cleanup";
import builtins from "builtin-modules";

const { name, version, description, main, module, bin } = JSON.parse(
  readFileSync("./package.json", { encoding: "utf8" })
);

const external = [
  ...builtins,
  "levelup",
  "koa",
  "koa-better-router",
  "koa-jwt",
  "leveldown",
  "statuses",
  "mime-db",
  "iconv-lite",
  "sd-daemon"
];
const extensions = ["js", "mjs", "jsx", "tag"];
const plugins = [
  commonjs(),
  resolve(),
  consts({
    name,
    version,
    description
  }),
  cleanup({
    extensions
  })
];

const config = Object.keys(bin || {}).map(name => {
  return {
    input: `src/${name}-cli.mjs`,
    output: {
      plugins: [executable()],
      banner:
      '#!/bin/sh\n":" //# comment; exec /usr/bin/env node "$0" "$@"',
      file: bin[name]
    }
  };
});

if (module !== undefined && main !== undefined && module != main) {
  config.push({
    input: module,
    output: {
      file: main
    }
  });
}

export default config.map(c => {
  c.output = {
    interop: false,
    externalLiveBindings: false,
    format: "cjs",
    ...c.output
  };
  return { plugins, external, ...c };
});
