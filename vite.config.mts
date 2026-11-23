import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import forceTerserPlugin from "./vite-plugin-force-terser.js";
import glsl from "vite-plugin-glsl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// vite-plugin-glsl 1.6 emits shaders through a JS template literal when Vite exposes OXC.
// Keep GLSL ${...} placeholders as text so stringTemplate2 can replace them at runtime.
const escapeGlslTemplatePlaceholders = (shader: string) => shader.replace(/\$\{/g, "\\${");

/**
 * Production chunks, each is a module in src/ with everything it imports.
 * A module imported by several groups goes to the first of them.
 */
const CHUNK_GROUPS = ["core", "planet", "strategy", "layer", "terrain", "proj4", "geotiff", "control", "ui"];

/**
 * Modes: production is the chunked minified library, development is one unminified file,
 * all is the whole library in one minified file.
 * @param {{ mode: 'development' | 'production' | 'all' }} param0
 * @returns {import('vite').UserConfig}
 */
export default function ({ mode }: { mode: "development" | "production" | "all" }) {
    const isDev = mode === "development";
    const isChunked = mode === "production";
    const entry = path.resolve(__dirname, "./src/index.ts");
    const ogVersion = JSON.parse(readFileSync(path.resolve(__dirname, "./package.json"), "utf8")).version;

    return {
        define: {
            __OG_VERSION__: JSON.stringify(ogVersion)
        },
        build: {
            minify: !isDev,
            lib: {
                // The chunk groups are entries too, rolldown needs them in the module graph.
                entry: Object.fromEntries([
                    ["og", entry],
                    ...(isChunked ? CHUNK_GROUPS.map((g) => [g, `./src/${g}.ts`]) : [])
                ]),
                name: "og",
                fileName: (format, name) => (name === "og" ? `og.${format}.js` : `groups/${name}.js`),
                formats: ["es"],
                cssFileName: "og"
            },
            emptyOutDir: true,
            outDir: path.resolve(__dirname, "./lib"),
            sourcemap: !isChunked,
            rollupOptions: {
                output: {
                    assetFileNames: `[name][extname]`,
                    sourcemapExcludeSources: !isDev,
                    // One file inlines the lazy imports too.
                    ...(!isChunked
                        ? { codeSplitting: false }
                        : {
                              codeSplitting: {
                                  groups: CHUNK_GROUPS.map((name, i) => ({
                                      name,
                                      test: `/src/${name}.ts`,
                                      priority: CHUNK_GROUPS.length - i
                                  }))
                              },
                              chunkFileNames: "chunks/[name].js"
                          })
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
            !isDev && forceTerserPlugin(),
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
