import cleanup from "rollup-plugin-cleanup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import pkg from "./package.json";

const external = [
  "http",
  "https",
  "path",
  "url",
  "os",
  "koa",
  "koa-better-router",
  //"querystring",
  "jsonwebtoken",
  "config-expander"
];

export default [
  ...Object.keys(pkg.bin).map(name => {
    return {
      input: `src/${name}.js`,
      output: {
        file: pkg.bin[name],
        format: "cjs",
        banner:
          '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-worker "$0" "$@"',
        interop: false
      },
      external,
      plugins: [
        resolve(),
        commonjs(),
        json({
          include: "package.json",
          preferConst: true,
          compact: true
        }),
        cleanup(),
        executable()
      ]
    };
  })
];
