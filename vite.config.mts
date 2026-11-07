import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import glsl from "vite-plugin-glsl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// vite-plugin-glsl 1.6 emits shaders through a JS template literal when Vite exposes OXC.
// Keep GLSL ${...} placeholders as text so stringTemplate2 can replace them at runtime.
const escapeGlslTemplatePlaceholders = (shader: string) => shader.replace(/\$\{/g, "\\${");

/**
 * @param {{ mode: 'development' | 'production' }} param0
 * @returns {import('vite').UserConfig}
 */
export default function ({ mode }: { mode: "development" | "production" }) {
    const isDev = mode === "development";
    const ogVersion = JSON.parse(readFileSync(path.resolve(__dirname, "./package.json"), "utf8")).version;

    return {
        define: {
            __OG_VERSION__: JSON.stringify(ogVersion)
        },
        build: {
            minify: !isDev,
            lib: {
                entry: {
                    index: "./src/index.ts",
                    core: "./src/core.ts",
                    terrain: "./src/terrain.ts",
                    renderer: "./src/renderer.ts",
                    controls: "./src/controls.ts"
                },
                name: "og",
                fileName: (format: string, entryName: string) =>
                    entryName === "index" ? "og.es.js" : `${entryName}.js`,
                formats: ["es"],
                cssFileName: "og"
            },
            emptyOutDir: true,
            outDir: path.resolve(__dirname, "./lib"),
            sourcemap: true,
            rollupOptions: {
                output: {
                    assetFileNames: `[name][extname]`,
                    sourcemapExcludeSources: !isDev
                }
            }
        },
        plugins: [
            glsl({
                include: ["**/*.glsl", "**/*.wgsl", "**/*.vert", "**/*.frag", "**/*.vs", "**/*.fs"],
                defaultExtension: "glsl",
                exclude: undefined,
                warnDuplicatedImports: true,
                removeDuplicatedImports: false,
                onComplete: escapeGlslTemplatePlaceholders,
                minify: !isDev,
                watch: true,
                root: "/"
            }),
            viteStaticCopy({
                targets: [
                    {
                        src: "./res/",
                        dest: "./"
                    }
                ]
            })
        ],
        server: {
            fs: {
                strict: true,
                allow: ["src"]
            },
            watch: {
                ignored: ["!**/*.glsl", "!**/res/**"]
            }
        },
        optimizeDeps: {
            noDiscovery: true,
            include: []
        }
    };
}
