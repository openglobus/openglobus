import { readFile, writeFile } from 'fs/promises';
import { minify } from 'terser';

export default function forceTerserPlugin({ filePath }) {
    return {
        name: 'vite-plugin-force-terser',
        apply: 'build',
        closeBundle: async () => {
            const code = await readFile(filePath, 'utf-8');

            const result = await minify(code, {
                compress: true,
                mangle: true,
                format: {
                    comments: true
                }
            });

            if (result.code) {
                await writeFile(filePath, result.code, 'utf-8');
                console.log(`✔ ${filePath} minified with terser`);
            } else {
                console.warn('⚠ terser did not return any code');
            }
        }
    };
}