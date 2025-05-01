import {defineConfig} from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setupTests.js'],
        alias: [{
            find: /^(.*)\.glsl$/, replacement: path.resolve(path.resolve(__dirname), 'tests/__mocks__/glslMock.js')
        }]
    }
});
