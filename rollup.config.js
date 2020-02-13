import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-porter';
import replace from '@rollup/plugin-replace';
import pkg from './package.json';

const LIB_SUFFIX = process.env.entry ? `.${process.env.entry}` : "";
const LIB_NAME = pkg.name + LIB_SUFFIX;
const OUTPUT_NAME = `dist/${LIB_NAME}-${pkg.version}`;

export default {
    input: `src/og/index${LIB_SUFFIX}.js`,
    output: [
        {
            file: OUTPUT_NAME + ".js",
            format: 'umd',
            name: pkg.name,
            sourcemap: false
        }
    ],
    plugins: [
        terser(),
        css({
            raw: false,
            minified: OUTPUT_NAME + ".css"
        }),
        replace({ __VERSION__: JSON.stringify(pkg.version) })
    ]
};