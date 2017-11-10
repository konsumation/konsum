import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',

  plugins: [
    istanbul({
      exclude: ['tests/*.js', 'node_modules/**/*']
    }),
    nodeResolve({
      jsnext: true
    }),
    commonjs(),
    multiEntry()
  ],

  external: ['buffer'],

  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true
  }
};
