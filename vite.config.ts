import path from 'path';
import terser from '@rollup/plugin-terser';
import {viteStaticCopy} from 'vite-plugin-static-copy'
import forceTerserPlugin from './vite-plugin-force-terser.js';

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
            outDir: path.resolve(__dirname, './lib/@openglobus'),
            sourcemap: isDev,
            rollupOptions: {
                output: {
                    entryFileNames: `og.[format].js`,
                    assetFileNames: `[name][extname]`
                },
                plugins: [
                    // doesn't work for esm modules
                    terser({
                        compress: true,
                        mangle: true,
                        format: {
                            comments: false
                        }
                    })
                ]
            }
        },
        plugins: [
            // this works for esm modules
            !isDev && forceTerserPlugin({filePath: "./lib/@openglobus/og.es.js"}),
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
            }
        },
        optimizeDeps: {
            noDiscovery: true,
            include: []
        }
    };
}
