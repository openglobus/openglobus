import { terser } from "rollup-plugin-terser";
import json from "@rollup/plugin-json";
import pkg from "./package.json";
import postcss from "rollup-plugin-postcss";

const LIB_SUFFIX = process.env.entry ? `.${process.env.entry}` : "";
const LIB_NAME = pkg.name + LIB_SUFFIX;
const OUTPUT_NAME = `dist/${LIB_NAME}.`;

export default [
    {
        input: `src/og/index${LIB_SUFFIX}.js`,
        output: [
            {
                file: `${OUTPUT_NAME}umd.js`,
                format: "umd",
                name: "og",
                sourcemap: true
            }
        ],
        plugins: [terser(), json()]
    },
    {
        input: `src/og/utils/workers/Terrain.js`,
        output: [
            {
                file: `${OUTPUT_NAME}Terrain.js`,
                name: "og",
                sourcemap: true
            }
        ],
        plugins: [terser(), json()]
    },
    {
        input: `src/og/utils/workers/PlainSegment.js`,
        output: [
            {
                file: `${OUTPUT_NAME}PlainSegment.js`,
                name: "og",
                sourcemap: true
            }
        ],
        plugins: [terser(), json()]
    },
    {
        input: `src/og/index${LIB_SUFFIX}.js`,
        output: [
            {
                file: `${OUTPUT_NAME}esm.js`,
                format: "esm",
                sourcemap: true
            }
        ],
        plugins: [terser(), json()]
    },
    {
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
