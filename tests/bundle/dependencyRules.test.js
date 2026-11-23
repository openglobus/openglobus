import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const SRC = path.resolve(__dirname, "../../src");

const IMPORT_RE =
    /(?:^|[\s;])(?:import|export)\s*(?:[^"'`;]*?\sfrom\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const graph = new Map();

/** Runtime imports of a module: type-only imports are dropped by transpileModule. */
function getImports(file) {
    if (graph.has(file)) return graph.get(file);
    const source = fs.readFileSync(file, "utf8");
    const js = file.endsWith(".ts")
        ? ts.transpileModule(source, {
              fileName: file,
              compilerOptions: {
                  target: ts.ScriptTarget.ES2022,
                  module: ts.ModuleKind.ESNext,
                  isolatedModules: true,
                  verbatimModuleSyntax: false
              }
          }).outputText
        : source;
    const imports = [];
    for (const m of js.matchAll(IMPORT_RE)) {
        const resolved = resolve(file, m[1] || m[2]);
        if (resolved) imports.push(resolved);
    }
    graph.set(file, imports);
    return imports;
}

function resolve(from, spec) {
    if (!spec.startsWith(".")) return null;
    const base = path.resolve(path.dirname(from), spec.replace(/\?.*$/, ""));
    for (const candidate of [
        base,
        `${base}.ts`,
        `${base}.js`,
        path.join(base, "index.ts"),
        path.join(base, "index.js")
    ]) {
        if (/\.(ts|js)$/.test(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    return null;
}

/** Returns the import chain from each entry to every reachable module. */
function walk(entries) {
    const parent = new Map(entries.map((e) => [e, null]));
    const queue = [...entries];
    while (queue.length) {
        const file = queue.shift();
        for (const dep of getImports(file)) {
            if (!parent.has(dep)) {
                parent.set(dep, file);
                queue.push(dep);
            }
        }
    }
    return parent;
}

const rel = (file) => path.relative(SRC, file).split(path.sep).join("/");

const name = (file) => rel(file).replace(/\.(ts|js)$/, "");

function chain(parent, file) {
    const out = [];
    for (let f = file; f; f = parent.get(f)) out.unshift(name(f));
    return out.join(" -> ");
}

const src = (p) => path.join(SRC, p);

/**
 * Fails with the import chains when any module matching `forbidden` is reachable from `entry`.
 * Patterns match module paths relative to src/, without the extension.
 */
function expectNotReachable(entry, forbidden) {
    const parent = walk([src(entry)]);
    const leaks = [...parent.keys()].filter((f) => forbidden.some((p) => p.test(name(f)))).map((f) => chain(parent, f));
    expect(leaks).toEqual([]);
}

const exact = (...names) => names.map((n) => new RegExp(`^${n}$`));

describe("dependency rules", () => {
    describe("layers", () => {
        test("XYZ", () => {
            expectNotReachable(
                "layer/XYZ.ts",
                exact("layer/Bing", "layer/OpenStreetMap", "layer/WMS", "layer/KML", "scene/Planet")
            );
        });

        test("OpenStreetMap", () => {
            expectNotReachable("layer/OpenStreetMap.ts", exact("layer/Bing", "layer/WMS"));
        });
    });

    describe("renderer and entities without a planet", () => {
        const planetModules = exact(
            "scene/Planet",
            "Globe",
            "layer/Layer",
            "layer/Vector",
            "quadTree/Node",
            "quadTree/QuadTreeStrategy",
            "quadTree/EntityCollectionNode",
            "quadTree/quadTree",
            "segment/.*",
            "proj/cube",
            "entity/geometry/GeometryHandler",
            "entity/geometry/triangulateOnGrid"
        );

        for (const entry of [
            "renderer/Renderer.ts",
            "entity/EntityCollection.ts",
            "entity/Entity.ts",
            "entity/billboard/Billboard.ts",
            "entity/label/Label.ts",
            "entity/geoObject/GeoObject.ts",
            "entity/polyline/Polyline.ts",
            "entity/ray/Ray.ts"
        ]) {
            test(entry, () => {
                expectNotReachable(entry, planetModules);
            });
        }
    });

    describe("Globe", () => {
        test("no optional terrains and layers", () => {
            expectNotReachable(
                "Globe.ts",
                exact(
                    "terrain/GlobusTerrain",
                    "terrain/ProceduralTerrain",
                    "terrain/GeoTiffTerrain",
                    "terrain/MapterhornTerrain",
                    "layer/KML",
                    "layer/Bing"
                )
            );
        });

        // Allow-list: a new control is covered automatically.
        const DEFAULT_CONTROLS = [
            "Control",
            "CompassButton",
            "EarthCoordinates",
            "FreeNavigation",
            "Navigation",
            "PoweredBy",
            "ScaleControl",
            "Sun",
            "TouchNavigation",
            "atmosphere/Atmosphere",
            "SimpleSkyBackground"
        ];

        test("only default controls", () => {
            const parent = walk([src("Globe.ts")]);
            const leaks = [...parent.keys()]
                .filter((f) => name(f).startsWith("control/"))
                .filter((f) => !DEFAULT_CONTROLS.includes(name(f).slice("control/".length)))
                .map((f) => chain(parent, f));
            expect(leaks).toEqual([]);
        });
    });

    describe("controls are plugins", () => {
        // A control is a file in src/control/ or a folder of it.
        const controlOf = (file) => {
            const r = rel(file);
            if (!r.startsWith("control/")) return null;
            const parts = r.slice("control/".length).split("/");
            return parts.length > 1 ? parts[0] : parts[0].replace(/\.(ts|js)$/, "");
        };

        // Dependencies of an allowed control are allowed too.
        const ALLOWED = {
            entityEditor: ["entityGizmo", "CameraLock"],
            entityTree: ["entityEditor"],
            heightRuler: ["ruler", "RulerSwitcher"],
            DragAndDrop: ["GeoTiffTypeDialog", "entityEditor"],
            DrawingSwitcher: ["drawing"],
            FreeNavigation: ["Navigation"],
            RulerSwitcher: ["heightRuler"]
        };

        const allowedFor = (control, out = new Set([control])) => {
            for (const dep of ALLOWED[control] || []) {
                if (!out.has(dep)) {
                    out.add(dep);
                    allowedFor(dep, out);
                }
            }
            return out;
        };

        const controlDir = src("control");
        const controls = fs
            .readdirSync(controlDir, { withFileTypes: true })
            .map((e) => (e.isDirectory() ? e.name : e.name.replace(/\.(ts|js)$/, "")))
            .filter((c) => c !== "Control" && c !== "index");

        const filesOf = (control) => {
            const dir = path.join(controlDir, control);
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                return fs
                    .readdirSync(dir, { recursive: true })
                    .filter((f) => /\.(ts|js)$/.test(f))
                    .map((f) => path.join(dir, f));
            }
            return [resolve(path.join(controlDir, "x"), `./${control}`)];
        };

        for (const control of controls) {
            test(control, () => {
                const parent = walk(filesOf(control));
                const allowed = [...allowedFor(control), "Control"];
                const leaks = [...parent.keys()]
                    .filter((f) => {
                        const c = controlOf(f);
                        return c && !allowed.includes(c);
                    })
                    .map((f) => chain(parent, f));
                expect(leaks).toEqual([]);
            });
        }
    });

    test("no module imports src/index.ts", () => {
        const index = src("index.ts");
        const all = fs
            .readdirSync(SRC, { recursive: true })
            .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".d.ts"))
            .map((f) => path.join(SRC, f))
            .filter((f) => f !== index);
        const importers = all.filter((f) => getImports(f).includes(index)).map(name);
        expect(importers).toEqual([]);
    });
});
