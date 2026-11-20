import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { build } from "vite";

// Checks the built library, so it runs after `npm run build:prod` or `npm run build:all` and is skipped without it.
const LIB_DIR = path.resolve(__dirname, "../../lib");
const LIB = path.join(LIB_DIR, "og.es.js");
const CHUNKED = fs.existsSync(path.join(LIB_DIR, "chunks"));
const FIXTURES = path.resolve(__dirname, "fixtures");
const VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8")).version;

// Strings that only the module itself contains, the library is minified.
const MARKERS = {
    Bing: "virtualearth",
    OpenStreetMap: "tile.openstreetmap.org",
    MapterhornTerrain: "mapterhorn",
    geotiff: "Invalid byte order",
    Globe: "globus_planet_",
    TimelineControl: "og-timeline",
    EntityEditor: "og-editor-panel"
};

// Initial load gzip budgets in KB, with some room above the current sizes.
const APPS = [
    // XYZ is a planet layer, it takes the planet chunk.
    { app: "xyz", maxKB: 310, absent: ["Bing", "OpenStreetMap", "MapterhornTerrain", "geotiff"] },
    { app: "entities", maxKB: 200, absent: ["Bing", "OpenStreetMap", "MapterhornTerrain", "geotiff", "Globe"] },
    { app: "globe", maxKB: 330, absent: ["Bing", "OpenStreetMap", "MapterhornTerrain", "geotiff"] },
    // A control imported by name brings no other optional control.
    { app: "control", maxKB: 330, absent: ["MapterhornTerrain", "geotiff", "TimelineControl", "EntityEditor"] }
];

const STATIC_IMPORT_RE = /(?:from|import)\s*["'](\.\.?\/[^"']+)["']/g;

/** Library files and their static imports of other library files. */
function readLibGraph() {
    const files = [
        "og.es.js",
        ...(CHUNKED ? fs.readdirSync(path.join(LIB_DIR, "chunks")) : [])
            .filter((f) => f.endsWith(".js"))
            .map((f) => `chunks/${f}`)
    ];
    const graph = new Map();
    for (const f of files) {
        const code = fs.readFileSync(path.join(LIB_DIR, f), "utf8");
        graph.set(
            f,
            [...code.matchAll(STATIC_IMPORT_RE)].map((m) => path.posix.join(path.posix.dirname(f), m[1]))
        );
    }
    return graph;
}

function findCycles(graph) {
    const state = new Map();
    const cycles = [];
    const visit = (f, stack) => {
        state.set(f, 1);
        stack.push(f);
        for (const to of graph.get(f) ?? []) {
            if (state.get(to) === 1) cycles.push([...stack.slice(stack.indexOf(to)), to].join(" -> "));
            else if (!state.has(to)) visit(to, stack);
        }
        stack.pop();
        state.set(f, 2);
    };
    for (const f of graph.keys()) if (!state.has(f)) visit(f, []);
    return cycles;
}

/** Builds a fixture app and returns the code of its initial load. */
async function buildApp(app) {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `og-bundle-${app}-`));
    try {
        await build({
            configFile: false,
            logLevel: "silent",
            root: FIXTURES,
            resolve: { alias: { "@openglobus/og": LIB } },
            build: {
                outDir,
                emptyOutDir: true,
                minify: true,
                manifest: true,
                rollupOptions: { input: path.join(FIXTURES, `${app}.js`) }
            }
        });
        const manifest = JSON.parse(fs.readFileSync(path.join(outDir, ".vite/manifest.json"), "utf8"));
        const initial = new Set();
        const visit = (key) => {
            const chunk = manifest[key];
            if (!chunk || initial.has(chunk.file)) return;
            initial.add(chunk.file);
            (chunk.imports ?? []).forEach(visit);
        };
        visit(Object.keys(manifest).find((k) => manifest[k].isEntry));
        return [...initial].map((f) => fs.readFileSync(path.join(outDir, f), "utf8")).join("");
    } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
}

describe.skipIf(!fs.existsSync(LIB))("built library", () => {
    test("keeps pure annotations", () => {
        const code = [...readLibGraph().keys()].map((f) => fs.readFileSync(path.join(LIB_DIR, f), "utf8")).join("");
        expect(code.match(/__PURE__/g)?.length ?? 0).toBeGreaterThan(150);
    });

    test("loads and exports the same API as the sources", async () => {
        const og = await import(/* @vite-ignore */ LIB);
        const src = await import("../../src/index.ts");
        expect(Object.keys(og).sort()).toEqual(Object.keys(src).sort());
        expect(new og.XYZ("xyz", { url: "https://tile/{z}/{x}/{y}.png" })).toBeInstanceOf(og.Layer);
        expect(new og.EntityCollection().getEntities()).toEqual([]);
    }, 120000);
});

describe.skipIf(!fs.existsSync(LIB) || CHUNKED)("one file library", () => {
    test("has everything inside, the lazy imports too", () => {
        expect(readLibGraph().get("og.es.js")).toEqual([]);
        expect(fs.readFileSync(LIB, "utf8")).not.toMatch(/import\(\s*["']\.\.?\//);
    });
});

describe.skipIf(!fs.existsSync(LIB) || !CHUNKED)("chunked library", () => {
    test("chunks don't import each other in a cycle", () => {
        expect(findCycles(readLibGraph())).toEqual([]);
    });

    test("core chunk imports no other library chunk", () => {
        const deps = readLibGraph()
            .get("chunks/core.js")
            .filter((f) => !f.includes("rolldown-runtime"));
        expect(deps).toEqual([]);
    });

    test("layer and terrain chunks don't import geotiff and proj4", () => {
        const graph = readLibGraph();
        for (const chunk of ["chunks/layer.js", "chunks/terrain.js"]) {
            expect(graph.get(chunk).filter((f) => /\/(geotiff|proj4)\.js$/.test(f))).toEqual([]);
        }
    });

    test("entry only re-exports, every module is in a chunk group", () => {
        // A module left out of the groups lands in the entry with its classes.
        const code = fs.readFileSync(LIB, "utf8");
        expect(code).not.toMatch(/\bclass\b/);
        expect(code.length).toBeLessThan(15000);
    });

    for (const { app, maxKB, absent } of APPS) {
        test(`${app} app takes only what it uses`, async () => {
            const code = await buildApp(app);
            expect(absent.filter((m) => code.includes(MARKERS[m]))).toEqual([]);
            // globalThis.og.version is set by the entry, its side effect.
            expect(code).toContain(VERSION);
            expect(zlib.gzipSync(code, { level: 9 }).length / 1024).toBeLessThan(maxKB);
        }, 120000);
    }
});
