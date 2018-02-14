import pkg from './package.json';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: pkg.module,
  output: {
    file: pkg.main,
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
  external: ['config-expander'],
  plugins: [nodeResolve(), commonjs()]
};
