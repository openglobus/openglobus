import path from 'node:path';
import {fileURLToPath} from 'node:url';
import terser from '@rollup/plugin-terser';
import {viteStaticCopy} from 'vite-plugin-static-copy';
import forceTerserPlugin from './vite-plugin-force-terser.js';
import glsl from 'vite-plugin-glsl';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {{ mode: 'development' | 'production' }} param0
 * @returns {import('vite').UserConfig}
 */
export default function ({mode}: { mode: 'development' | 'production' }) {
    const isDev = mode === 'development';

    return {
        build: {
            minify: !isDev,
            lib: {
                entry: ['./src/index.ts'],
                name: 'og',
                fileName: 'og',
                formats: ['es'],
                cssFileName: 'og',
            },
            emptyOutDir: true,
            outDir: path.resolve(__dirname, './lib'),
            sourcemap: true,
            rollupOptions: {
                output: {
                    entryFileNames: `og.[format].js`,
                    assetFileNames: `[name][extname]`,
                    sourcemapExcludeSources: !isDev,
                },
                plugins: !isDev ? [
                    terser({
                        compress: true,
                        mangle: true,
                        format: {
                            comments: false
                        }
                    })
                ] : [] // important no plugins for development mode
            }
        },
        plugins: [
            glsl({
                include: [
                    '**/*.glsl', '**/*.wgsl',
                    '**/*.vert', '**/*.frag',
                    '**/*.vs', '**/*.fs'
                ],
                defaultExtension: 'glsl',
                exclude: undefined,
                warnDuplicatedImports: true,
                removeDuplicatedImports: false,
                minify: !isDev,
                watch: true,
                root: '/'
            }),
            // this works for esm modules
            !isDev && forceTerserPlugin({filePath: "./lib/og.es.js"}),
            viteStaticCopy({
                targets: [
                    {
                        src: './res/',
                        dest: './'
                    }
                ]
            })
        ],
        server: {
            fs: {
                strict: true,
                allow: ['src']
            },
            watch: {
                ignored: [
                    '!**/*.glsl',
                    '!**/res/**'
                ]
            }
        },
        optimizeDeps: {
            noDiscovery: true,
            include: []
        }
    };
}
