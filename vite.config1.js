import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {viteStaticCopy} from 'vite-plugin-static-copy';

import glsl from 'vite-plugin-glsl';
import mkcert from 'vite-plugin-mkcert';
import minimist from 'minimist';

// Парсим аргументы командной строки
const args = minimist(process.argv.slice(2));
const isDev = args.mode === 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    {
      name: 'generate-file-list',
      buildStart() {
        const dirPath = path.resolve(__dirname, 'sandbox'); // Путь к HTML-файлам
        const files = fs.readdirSync(dirPath, {recursive: true})
          .map(file => {
            const filePath = path.join(dirPath, file);
            return {
              name: file,
              mtime: fs.statSync(filePath).mtime.getTime() // Время изменения в миллисекундах
            };
          })
          .filter(item => 
            path.extname(item.name).toLowerCase() === '.html'
          )
          .sort((a, b) => a.mtime - b.mtime); // Сортировка: новые файлы сначала
// console.log('files',files)
        const outputPath = path.resolve(__dirname, 'sandbox/sandbox.json');
        fs.writeFileSync(outputPath, JSON.stringify(files));
      }
    },
    glsl({
        include: [                      // Glob pattern, or array of glob patterns to import
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
    }),
    {
        name: 'sw-headers',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
            if (req.url.includes('sw.js')) {
                res.setHeader('Service-Worker-Allowed', '/')
            }
            next()
            })
        }
    },
    mkcert()
  ],
  server: {
      https: true,
      open: true,
      watch: {
          ignored: [
              '!**/*.glsl',
              '!**/res/**'
          ]
      }
  },

});