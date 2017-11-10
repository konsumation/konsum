import pkg from './package.json';

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  plugins: [nodeResolve(), commonjs()],
  external: ['config-expander'],
  input: pkg.module,
  output: {
    file: pkg.main,
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  }
};
