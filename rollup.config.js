import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-porter';
import replace from '@rollup/plugin-replace';
import pkg from './package.json';

export default {
    input: 'src/og/index.js',
    output: [
        {
            file: pkg.main,
            format: 'umd',
            name: 'og',
            sourcemap: false
        }
    ],
    plugins: [
        terser(),
        css({
            raw: false,
            minified: pkg.style
        }),
        replace({ __VERSION__: JSON.stringify(pkg.version) })
    ]
};