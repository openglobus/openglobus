import { fitTextToAtlas, MVTLayer } from "../../src/layer/MVTLayer";
import { decodeMVTFeatures } from "../../src/layer/mvt/decodeMVTFeatures";
import { MVT_POINT } from "../../src/layer/mvt/VectorTile";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { EPSG4326 } from "../../src/proj/EPSG4326";
import { command, encodeTile, zigzag } from "./mvt/pbfWriter";

// No worker by default, tiles are decoded right away
const mocks = vi.hoisted(() => ({ worker: null }));
vi.mock("../../src/layer/mvt/MVTWorker", () => ({ getMVTWorker: () => mocks.worker }));

afterEach(() => {
    mocks.worker = null;
});

let nodeId = 0;

function node(z, x, y, projection = EPSG3857) {
    return {
        __id: ++nodeId,
        segment: {
            tileZoom: z,
            tileX: x,
            tileY: y,
            _projection: projection,
            terrainReady: false,
            getEntityTerrainPoint: () => 0
        }
    };
}

// A rendered node with its ancestors up to zoom 0, sizeOf(zoom) is the node screen size the camera gives
function nodeWithAncestors(z, x, y, sizeOf) {
    let parent = null;
    for (let i = 0; i <= z; i++) {
        const d = z - i;
        const n = node(i, x >> d, y >> d);
        n.parentNode = parent;
        n.segment.bsphere = { center: { size: sizeOf(i) }, radius: 1 };
        n.segment._plainRadius = 1;
        parent = n;
    }
    return parent;
}

// Stands in for the planet: rendered nodes, and a tile loader that keeps requests until answered
function createLayer(options = {}) {
    const layer = new MVTLayer("mvt", { url: "https://{s}.tiles/{z}/{x}/{y}.pbf", ...options });
    const requests = [];
    const planet = {
        quadTreeStrategy: { _renderedNodes: [], minCurrZoom: 0, maxCurrZoom: 12 },
        _tileLoader: {
            // Like Loader, the filter is checked when the request starts, which may be right away
            load: (params, callback) =>
                params.filter && !params.filter(params)
                    ? callback({ status: "abort" })
                    : requests.push({ params, callback }),
            abort: () => {},
            getRequestCounter: () => requests.length
        },
        getViewExtent: () => null,
        // Entity collections stay out of the scene, labels wait for a renderer in their handlers
        addEntityCollection: () => {},
        camera: {
            width: 800,
            height: 600,
            eye: { x: 0, y: 0, z: 0 },
            projectedSize: (center) => center.size,
            frustums: [{ projectionViewMatrix: { _m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] } }]
        },
        renderer: null
    };
    layer._planet = planet;

    const frame = (nodes) => {
        planet.quadTreeStrategy._renderedNodes = nodes;
        layer.collectVisibleCollections([]);
    };

    const respond = (url, status = "ready", data = new ArrayBuffer(0)) => {
        const i = requests.findIndex((r) => r.params.src.endsWith(url));
        expect(i).toBeGreaterThan(-1);
        const [r] = requests.splice(i, 1);
        r.callback(status === "ready" ? { status, data } : { status });
    };

    const shown = () => layer._shownTiles.map((t) => t.key).sort();

    return { layer, planet, requests, frame, respond, shown };
}

describe("MVTLayer tiles", () => {
    test("requests one vector tile per rendered tile, deeper tiles use maxNativeZoom", () => {
        const { requests, frame } = createLayer({ maxNativeZoom: 14 });

        frame([node(12, 2326, 1250), node(12, 2327, 1250), node(16, 37216, 20000), node(16, 37217, 20000)]);

        expect(requests.map((r) => r.params.src.replace(/^https:\/\/.\./, "")).sort()).toEqual([
            "tiles/12/2326/1250.pbf",
            "tiles/12/2327/1250.pbf",
            "tiles/14/9304/5000.pbf"
        ]);
        expect(requests.every((r) => r.params.type === "arrayBuffer")).toBe(true);
    });

    test("requests tiles that become needed after the first frames", () => {
        const { requests, frame } = createLayer();
        for (let i = 0; i < 5; i++) {
            frame([node(2, 2, 1)]);
        }
        frame([node(10, 582, 312)]);
        expect(requests.map((r) => r.params.src.split("/").slice(-3).join("/"))).toEqual([
            "2/2/1.pbf",
            "10/582/312.pbf"
        ]);
    });

    // A rendered z12 node is 230 px on the screen, every ancestor twice its child
    const size12 = (z) => 230 * Math.pow(2, 12 - z);
    const requested = (requests) => requests.map((r) => r.params.src.split("/").slice(-3).join("/"));

    test("takes the coarsest ancestor still smaller on the screen than lodSize", () => {
        let { requests, frame } = createLayer();
        frame([nodeWithAncestors(12, 2326, 1250, size12)]);
        expect(requested(requests)).toEqual(["11/1163/625.pbf"]);

        ({ requests, frame } = createLayer({ lodSize: 1024 }));
        frame([nodeWithAncestors(12, 2326, 1250, size12)]);
        expect(requested(requests)).toEqual(["10/581/312.pbf"]);
    });

    test("uses the rendered node when its parent is too big on the screen", () => {
        const { requests, frame } = createLayer({ lodSize: 256 });
        frame([nodeWithAncestors(12, 2326, 1250, size12)]);
        expect(requested(requests)).toEqual(["12/2326/1250.pbf"]);
    });

    test("applies the LOD from the maxNativeZoom ancestor of deeper nodes", () => {
        const { requests, frame } = createLayer({ maxNativeZoom: 14 });
        // z14 is 57 px, z11 is 456 px and z10 912 px
        frame([nodeWithAncestors(16, 37216, 20000, (z) => 57 * Math.pow(2, 14 - z))]);
        expect(requested(requests)).toEqual(["11/1163/625.pbf"]);
    });

    test("stops at minNativeZoom", () => {
        const { requests, frame } = createLayer({ minNativeZoom: 11, lodSize: 1e9 });
        frame([nodeWithAncestors(12, 2326, 1250, size12)]);
        expect(requested(requests)).toEqual(["11/1163/625.pbf"]);
    });

    test("measures with the planet's LOD camera when it has one", () => {
        const { planet, requests, frame } = createLayer();
        planet.quadTreeStrategy.lodCamera = { projectedSize: () => 1e9 };
        frame([nodeWithAncestors(12, 2326, 1250, size12)]);
        expect(requested(requests)).toEqual(["12/2326/1250.pbf"]);
    });

    test("skips polar tiles and tiles below minNativeZoom", () => {
        const { requests, frame } = createLayer({ minNativeZoom: 2 });
        frame([node(3, 1, 0, EPSG4326), node(1, 0, 0)]);
        expect(requests.length).toBe(0);
    });

    test("draws the nearest loaded ancestor while a tile loads", () => {
        const { layer, frame, respond, shown } = createLayer();

        frame([node(11, 1163, 625)]);
        respond("/11/1163/625.pbf");
        frame([node(11, 1163, 625)]);
        expect(shown()).toEqual(["11/1163/625"]);

        // Zoom in: four children, one loaded
        const children = [node(12, 2326, 1250), node(12, 2327, 1250), node(12, 2326, 1251), node(12, 2327, 1251)];
        frame(children);
        expect(shown()).toEqual(["11/1163/625"]);

        respond("/12/2326/1250.pbf");
        frame(children);
        expect(shown()).toEqual(["11/1163/625", "12/2326/1250"]);

        // The parent is still drawn for the other children, its labels inside the loaded child are hidden
        const parent = layer._tiles.get("11/1163/625");
        expect(parent.hasShownDescendants).toBe(true);

        respond("/12/2327/1250.pbf");
        respond("/12/2326/1251.pbf");
        respond("/12/2327/1251.pbf");
        frame(children);
        expect(shown()).toEqual(["12/2326/1250", "12/2326/1251", "12/2327/1250", "12/2327/1251"]);
    });

    test("hides ancestor labels inside drawn descendants only", () => {
        const { layer, frame, respond } = createLayer();
        frame([node(11, 1163, 625)]);
        respond("/11/1163/625.pbf");

        const children = [node(12, 2326, 1250), node(12, 2327, 1250)];
        frame(children);
        respond("/12/2326/1250.pbf");
        frame(children);

        const parent = layer._tiles.get("11/1163/625");
        // North-west quarter is the drawn child 2326/1250
        expect(layer._isCovered(parent, { u: 0.25, v: 0.25 }, 12)).toBe(true);
        expect(layer._isCovered(parent, { u: 0.75, v: 0.25 }, 12)).toBe(false);
        expect(layer._isCovered(parent, { u: 0.25, v: 0.75 }, 12)).toBe(false);
    });

    test("treats missing tiles as empty, aborted ones are requested again", () => {
        const { requests, frame, respond, shown } = createLayer();
        const nodes = [node(10, 582, 312), node(10, 583, 312)];

        frame(nodes);
        respond("/10/582/312.pbf", "error");
        respond("/10/583/312.pbf", "abort");

        frame(nodes);
        expect(shown()).toEqual(["10/582/312"]);
        expect(requests.map((r) => r.params.src.slice(-15))).toEqual(["/10/583/312.pbf"]);
    });

    test("drops queued requests for tiles that aren't needed anymore", () => {
        const { requests, frame } = createLayer();

        frame([node(10, 582, 312)]);
        const [request] = requests;
        expect(request.params.filter()).toBe(true);

        frame([node(10, 600, 300)]);
        frame([node(10, 600, 300)]);
        frame([node(10, 600, 300)]);
        expect(request.params.filter()).toBe(false);
    });

    test("evicts least recently used tiles, keeping the drawn ones", () => {
        const { layer, frame, respond } = createLayer({ maxCachedTiles: 4 });

        for (let x = 0; x < 40; x++) {
            frame([node(10, x, 300)]);
            respond(`/10/${x}/300.pbf`);
        }

        frame([node(10, 39, 300)]);
        expect(layer._tiles.size).toBeLessThanOrEqual(4 + 32);
        expect(layer._tiles.has("10/39/300")).toBe(true);
        expect(layer._tiles.has("10/0/300")).toBe(false);
    });

    test("builds loaded tiles within the frame budget, at least one per frame", () => {
        const { frame, respond, shown } = createLayer({ tileBuildBudget: 0 });
        const nodes = [node(10, 582, 312), node(10, 583, 312), node(10, 584, 312)];

        frame(nodes);
        respond("/10/582/312.pbf");
        respond("/10/583/312.pbf");
        respond("/10/584/312.pbf");

        frame(nodes);
        expect(shown().length).toBe(1);
        frame(nodes);
        expect(shown().length).toBe(2);
        frame(nodes);
        expect(shown().length).toBe(3);
    });

    test("drops loaded tiles that aren't needed anymore", () => {
        const { layer, requests, frame, respond } = createLayer();

        frame([node(10, 582, 312)]);
        const away = [node(10, 10, 10)];
        frame(away);
        frame(away);
        frame(away);

        // The request was already running
        respond("/10/582/312.pbf");
        frame(away);
        expect(layer._pendingTiles.length).toBe(0);
        expect(layer._tiles.has("10/582/312")).toBe(false);

        // Requested again when needed
        frame([node(10, 582, 312)]);
        expect(requests.some((r) => r.params.src.endsWith("/10/582/312.pbf"))).toBe(true);
    });

    test("builds the most recently needed tiles first", () => {
        const { layer, frame, respond, shown } = createLayer({ tileBuildBudget: 0 });

        frame([node(10, 582, 312), node(10, 583, 312)]);
        frame([node(10, 583, 312)]);
        respond("/10/582/312.pbf");
        respond("/10/583/312.pbf");

        frame([node(10, 583, 312)]);
        expect(shown()).toEqual(["10/583/312"]);
    });

    test("builds urls from TileJSON tiles", () => {
        const { layer, requests, frame } = createLayer({ url: "" });

        frame([node(10, 582, 312)]);
        expect(requests.length).toBe(0);

        layer._tileJsonUrls = ["https://a.example/{z}/{x}/{y}.pbf", "https://b.example/{z}/{x}/{y}.pbf"];
        frame([node(10, 582, 312), node(10, 583, 312)]);
        expect(requests.map((r) => r.params.src).sort()).toEqual([
            "https://a.example/10/582/312.pbf",
            "https://b.example/10/583/312.pbf"
        ]);
    });

    test("doesn't load tiles outside the layer zoom range", () => {
        const { planet, requests, frame } = createLayer({ minZoom: 13 });
        planet.quadTreeStrategy.maxCurrZoom = 12;
        frame([node(12, 2326, 1250)]);
        expect(requests.length).toBe(0);
    });
});

describe("MVTLayer labels", () => {
    const tileData = () =>
        encodeTile([
            {
                name: "place",
                extent: 4096,
                features: [
                    {
                        type: MVT_POINT,
                        properties: { name: "Riga", class: "city", rank: { uint: 1 } },
                        geometry: [9, zigzag(1024), zigzag(2048)]
                    },
                    {
                        type: MVT_POINT,
                        properties: { name: "Saulkrasti", class: "town", rank: { uint: 11 } },
                        geometry: [9, 20, 20]
                    },
                    { type: MVT_POINT, properties: { class: "village" }, geometry: [9, 30, 30] },
                    { type: MVT_POINT, properties: { name: "Buffer", class: "town" }, geometry: [9, zigzag(-5), 4] }
                ]
            },
            {
                name: "mountain_peak",
                features: [
                    {
                        type: MVT_POINT,
                        properties: { name: "Gaiziņkalns", ele: { uint: 312 } },
                        geometry: [command(1, 1), 40, 40]
                    }
                ]
            }
        ]).buffer;

    const rules = [
        {
            layer: "place",
            filter: (p) => p.class !== "village",
            priority: (p) => -p.rank,
            label: { size: 14, align: "center" }
        },
        { layer: "mountain_peak", minZoom: 11, text: (p) => `${p.name} ${p.ele} m` }
    ];

    test("makes labels from the decoded features with the rules", () => {
        const { layer, frame, respond } = createLayer({ labels: rules });

        frame([node(10, 582, 312)]);
        respond("/10/582/312.pbf", "ready", tileData());
        frame([node(10, 582, 312)]);

        const tile = layer._tiles.get("10/582/312");
        expect(tile.labels.map((l) => [l.text, l.priority, l.order])).toEqual([
            ["Riga", -1, 0],
            ["Saulkrasti", -11, 1]
        ]);
        expect(tile.labels[0].u).toBe(0.25);
        expect(tile.labels[0].v).toBe(0.5);
        expect(tile.labels[0].size).toBe(14);
        expect(tile.labels[0].entity.properties).toEqual({ name: "Riga", class: "city", rank: 1 });
        // Declutter shows the labels in its next pass
        expect(tile.labels[0].entity.label.getVisibility()).toBe(false);
        expect(tile.collection).toBeTruthy();
    });

    test("decodes in the worker when there is one, asking only for the layers the rules need", async () => {
        const decodes = [];
        mocks.worker = {
            decode: (data, request) => {
                decodes.push(request);
                return Promise.resolve(decodeMVTFeatures(data, request));
            }
        };
        const { layer, frame, respond } = createLayer({ labels: rules });

        frame([node(10, 582, 312), node(11, 1164, 624)]);
        respond("/10/582/312.pbf", "ready", tileData());
        respond("/11/1164/624.pbf", "ready", tileData());

        expect(decodes.map((r) => [r.z, r.pointLayers])).toEqual([
            [10, ["place"]],
            [11, ["place", "mountain_peak"]]
        ]);
        expect(layer._decodingCount).toBe(2);

        await Promise.resolve();
        expect(layer._decodingCount).toBe(0);

        frame([node(10, 582, 312), node(11, 1164, 624)]);
        expect(layer._tiles.get("11/1164/624").labels.map((l) => l.text)).toEqual([
            "Riga",
            "Saulkrasti",
            "Gaiziņkalns 312 m"
        ]);
    });

    test("scales the tile labels with labelScale, leaving the layer scaleByDistance as it is", () => {
        const { layer, planet, respond } = createLayer({ labels: rules, labelScale: 1.5 });
        const collect = (nodes) => {
            planet.quadTreeStrategy._renderedNodes = nodes;
            const out = [];
            layer.collectVisibleCollections(out);
            return out;
        };

        collect([node(10, 582, 312)]);
        respond("/10/582/312.pbf", "ready", tileData());
        let ec = collect([node(10, 582, 312)]).find((c) => c === layer._tiles.get("10/582/312").collection);
        expect(ec.scaleByDistance[3]).toBe(1.5);
        expect(layer.scaleByDistance[3]).toBe(1);

        layer.labelScale = 0.5;
        layer.scaleByDistance[3] = 2;
        ec = collect([node(10, 582, 312)]).find((c) => c === layer._tiles.get("10/582/312").collection);
        expect(ec.scaleByDistance[3]).toBe(1);
    });

    test("changing declutter settings updates the label visibility", () => {
        const { layer } = createLayer({ labels: rules, declutterStrength: 0.5 });
        expect(layer.declutterStrength).toBe(0.5);

        for (const [prop, value] of [
            ["declutterStrength", 1.5],
            ["declutterPadding", 4],
            ["labelScale", 2],
            ["declutter", false]
        ]) {
            layer._visibilityDirty = layer._candidatesDirty = false;
            layer[prop] = value;
            expect(layer[prop]).toBe(value);
            expect(layer._visibilityDirty && layer._candidatesDirty).toBe(true);
        }
    });

    test("drops tiles decoded for a cleared layer", async () => {
        let resolve;
        mocks.worker = { decode: () => new Promise((r) => (resolve = r)) };
        const { layer, frame, respond } = createLayer({ labels: rules });

        frame([node(10, 582, 312)]);
        respond("/10/582/312.pbf", "ready", tileData());
        layer.setLabelRules(rules);
        resolve({ pointLayers: [] });
        await Promise.resolve();

        expect(layer._pendingTiles.length).toBe(0);
        expect(layer._decodingCount).toBe(0);
    });
});

describe("fitTextToAtlas", () => {
    const glyphs = new Set([..."abcdefghijklmnopqrstuvwxyzRSKL ćč"].map((c) => c.codePointAt(0)));
    const atlas = { get: (code) => (glyphs.has(code) ? {} : undefined) };

    test("replaces missing letters with base letters", () => {
        expect(fitTextToAtlas("Rīga", atlas)).toBe("Riga");
        expect(fitTextToAtlas("Ķīšupe", atlas)).toBe("Kisupe");
        expect(fitTextToAtlas("Sēja", atlas)).toBe("Seja");
    });

    test("keeps letters that exist in the atlas, and letters without a base letter", () => {
        expect(fitTextToAtlas("ćč", atlas)).toBe("ćč");
        expect(fitTextToAtlas("Łódź", atlas)).toBe("Łodz");
    });
});
