import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import pkg from "./package.json";
import postcss from "rollup-plugin-postcss";
import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';

const LIB_SUFFIX = process.env.entry ? `.${process.env.entry}` : "";
const LIB_NAME = pkg.name + LIB_SUFFIX;
const OUTPUT_NAME = `dist/${LIB_NAME}.`;

const DEV = [{
    input: `src/index${LIB_SUFFIX}.ts`,
    output: {
        file: `${OUTPUT_NAME}esm.js`,
        format: "esm",
        sourcemap: true
    },
    plugins: [
        json(),
        typescript({ tsconfig: './tsconfig.json' }),
        terser({ format: { comments: false } }),
        copy({
            targets: [{ src: './res', dest: './dist/@openglobus/' }]
        })
    ]
}, {
    input: `css/og.css`,
    output: {
        file: `${OUTPUT_NAME}css`,
        format: "umd",
        name: pkg.name,
        sourcemap: false
    },
    plugins: [
        postcss({
            extract: true,
            minimize: false
        })
    ]
}];

const PROD = [
    {
        input: `src/index${LIB_SUFFIX}.ts`,
        output: [
            {
                file: `${OUTPUT_NAME}umd.js`,
                format: "umd",
                name: "og",
                sourcemap: true
            }
        ],
        plugins: [
            terser({ format: { comments: false } }),
            json(),
            typescript({ tsconfig: './tsconfig.json' }),
            copy({
                targets: [{ src: './res', dest: './dist/@openglobus/' }]
            })
        ]
    }, {
        input: `src/index${LIB_SUFFIX}.ts`,
        output: [
            {
                file: `${OUTPUT_NAME}esm.js`,
                format: "esm",
                sourcemap: true
            }
        ],
        plugins: [
            terser({ format: { comments: false } }),
            json(),
            typescript({ tsconfig: './tsconfig.json' })
        ]
    }, {
        input: `css/og.css`,
        output: [
            {
                file: `${OUTPUT_NAME}css`,
                format: "umd",
                name: pkg.name,
                sourcemap: false
            }
        ],
        plugins: [
            postcss({
                extract: true,
                minimize: true
            })
        ]
    }
];

export default () => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? DEV : PROD;
}