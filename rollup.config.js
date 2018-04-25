import pkg from './package.json';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import executable from 'rollup-plugin-executable';

export default [
  ...Object.keys(pkg.bin).map(name => {
    return {
      input: `src/${name}.js`,
      output: {
        file: pkg.bin[name],
        format: 'cjs',
        banner: '#!/usr/bin/env node'
      },
      external: ['config-expander'],
      plugins: [nodeResolve(), commonjs(), executable()]
    };
  }),
  {
    input: pkg.module,
    output: {
      file: pkg.main,
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    external: ['config-expander'],
    plugins: [nodeResolve(), commonjs()]
  }
];
