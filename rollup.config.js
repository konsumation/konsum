import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  targets: [
    {
      dest: pkg.konsum,
      format: 'cjs'
    }
  ],
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ],
  external: ['expression-expander', 'pratt-parser']
};
