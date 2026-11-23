import { existsSync } from "node:fs";
import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import { minify } from "terser";

export default function forceTerserPlugin() {
    return {
        name: "vite-plugin-force-terser",
        apply: "build",
        async writeBundle(options, bundle) {
            const files = Object.values(bundle).filter((f) => f.type === "chunk");

            await Promise.all(
                files.map(async ({ fileName }) => {
                    const filePath = path.join(options.dir, fileName);
                    const mapPath = `${filePath}.map`;
                    const hasMap = existsSync(mapPath);
                    const [code, prevMap] = await Promise.all([
                        readFile(filePath, "utf-8"),
                        hasMap ? readFile(mapPath, "utf-8") : null
                    ]);

                    const result = await minify(
                        { [path.basename(fileName)]: code },
                        {
                            compress: true,
                            mangle: true,
                            format: { comments: false, preserve_annotations: true },
                            sourceMap: hasMap && {
                                content: prevMap,
                                filename: path.basename(fileName),
                                url: path.basename(mapPath)
                            }
                        }
                    );

                    if (!result.code || (hasMap && !result.map)) {
                        throw new Error(`terser did not return code or map for ${fileName}`);
                    }

                    await Promise.all([
                        writeFile(filePath, result.code, "utf-8"),
                        hasMap && writeFile(mapPath, result.map, "utf-8")
                    ]);
                })
            );

            console.log(`✔ ${files.length} files regenerated with Terser`);
        }
    };
}
