import { readFile, writeFile } from 'fs/promises';
import path from 'node:path';
import { minify } from 'terser';

export default function forceTerserPlugin({ filePath }) {
    const mapPath = `${filePath}.map`;
    const fileName = path.basename(filePath);
    const mapFileName = path.basename(mapPath);

    return {
        name: 'vite-plugin-force-terser',
        apply: 'build',
        async closeBundle() {
            const [code, prevMap] = await Promise.all([
                readFile(filePath, 'utf-8'),
                readFile(mapPath, 'utf-8')
            ]);

            const result = await minify(
                { [fileName]: code },
                {
                    compress: true,
                    mangle: true,
                    format: { comments: false },
                    sourceMap: {
                        content: prevMap,
                        filename: fileName,
                        url: mapFileName
                    }
                }
            );

            if (result.code && result.map) {
                await Promise.all([
                    writeFile(filePath, result.code, 'utf-8'),
                    writeFile(mapPath, result.map, 'utf-8'),
                ]);
                console.log(`✔ ${fileName} and ${mapFileName} regenerated with Terser`);
            } else {
                console.warn('⚠ terser did not return code or map');
            }
        }
    };
}