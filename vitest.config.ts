import {defineConfig} from 'vitest/config';
import path from 'path';
import {readFileSync} from 'fs';

const ogVersion = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf8')).version;

export default defineConfig({
    define: {
        __OG_VERSION__: JSON.stringify(ogVersion)
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setupTests.js'],
        alias: [{
            find: /^(.*)\.glsl$/, replacement: path.resolve(path.resolve(__dirname), 'tests/__mocks__/glslMock.js')
        }]
    }
});
