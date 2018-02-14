import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  external: ['ava', 'buffer'],
  plugins: [nodeResolve(), commonjs(), multiEntry()],

  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true
  }
};
