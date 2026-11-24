import { CubeRgbTerrain } from "../../src/terrain/CubeRgbTerrain";
import { RgbTerrain } from "../../src/terrain/RgbTerrain";
import { GlobusRgbTerrain } from "../../src/terrain/GlobusRgbTerrain";
import { CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { EarthQuadTreeStrategy } from "../../src/quadTree/earth/EarthQuadTreeStrategy";
import { TILEGROUP_COMMON, TILEGROUP_NORTH, TILEGROUP_SOUTH } from "../../src/segment/Segment";
import { getTileExtent } from "../../src/mercator";
import { Layer } from "../../src/layer/Layer";
import { LonLat } from "../../src/LonLat";
import { pow2i } from "../../src/math";
import { createStrategy } from "../quadTree/quadTreeScene";

const CUBES = [CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy];

const URL = "./dem/{f}/{z}/{x}/{y}.webp";

const SIZE = 256;

// The rgb value of a pixel is its index + 1, never the no data 0
const PIXELS = new Uint8ClampedArray(SIZE * SIZE * 4);
for (let k = 0; k < SIZE * SIZE; k++) {
    const v = k + 1;
    PIXELS.set([v >> 16, (v >> 8) & 255, v & 255, 255], k * 4);
}

const pixelOfHeight = (h) => Math.round((h + 10000) / 0.1) - 1;

const flush = async () => {
    for (let i = 0; i < 4; i++) {
        await Promise.resolve();
    }
};

function subdivide(node, zoom) {
    if (node.segment.tileZoom < zoom) {
        node.createChildNodes();
        node.nodes.forEach((n) => subdivide(n, zoom));
    }
}

function collect(node, out = []) {
    out.push(node.segment);
    node.nodes.forEach((n) => collect(n, out));
    return out;
}

function createCubeTerrain(Strategy, options) {
    const qts = createStrategy(Strategy),
        terrain = new CubeRgbTerrain(null, { url: URL, maxNativeZoom: 5, maxZoom: 7, ...options });

    terrain._planet = { quadTreeStrategy: qts };
    terrain._ctx = { clearRect() {}, drawImage() {}, getImageData: () => ({ data: PIXELS }) };
    terrain._loader.fetch = vi.fn(() => Promise.resolve({ status: "ready", data: {} }));

    return { qts, terrain };
}

test("buildURL puts the tile group in {f}, the urls without it stay the same", () => {
    const cubeTerrain = new CubeRgbTerrain(null, { url: URL });
    expect(cubeTerrain.buildURL(3, 4, 5, 2)).toBe("./dem/2/5/3/4.webp");
    expect(cubeTerrain.buildURL(0, 0, 0, 0)).toBe("./dem/0/0/0/0.webp");

    const mercator = new RgbTerrain(null, { url: "https://t.org/{z}/{x}/{y}.png" });
    expect(mercator.buildURL(3, 4, 5, TILEGROUP_COMMON)).toBe("https://t.org/5/3/4.png");
});

test.each(CUBES)("CubeRgbTerrain loads all the six faces of %o, RgbTerrain only the first one", (Strategy) => {
    const qts = createStrategy(Strategy),
        cubeTerrain = new CubeRgbTerrain(null, { url: URL }),
        rgbTerrain = new RgbTerrain(null, { url: URL });

    qts.quadTreeList.forEach((root) => subdivide(root, 2));

    const segments = qts.quadTreeList.flatMap((root) => collect(root));

    expect(new Set(segments.map((s) => s.tileGroup))).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    expect(segments.every((s) => cubeTerrain.isReadyToLoad(s))).toBe(true);
    expect(segments.filter((s) => rgbTerrain.isReadyToLoad(s)).every((s) => s.tileGroup === 0)).toBe(true);
});

test("CubeRgbTerrain loads only the faces in its extent", () => {
    const qts = createStrategy(CubeQuadTreeStrategy),
        // North of the corners of the side faces, 54.7 degrees: the top face only
        terrain = new CubeRgbTerrain(null, {
            url: URL,
            extent: [
                [-180, 60],
                [180, 90]
            ]
        });

    expect(
        qts.quadTreeList.filter((root) => terrain.isReadyToLoad(root.segment)).map((r) => r.segment.tileGroup)
    ).toEqual([0]);
});

test("the Earth strategy: RgbTerrain doesn't load the polar groups, GlobusRgbTerrain does", () => {
    const qts = createStrategy(EarthQuadTreeStrategy),
        rgb = new RgbTerrain(null, {}),
        globus = new GlobusRgbTerrain();

    const loads = (terrain) =>
        qts.quadTreeList.filter((root) => terrain.isReadyToLoad(root.segment)).map((r) => r.segment.tileGroup);

    expect(loads(rgb)).toEqual([TILEGROUP_COMMON]);
    expect(loads(globus)).toEqual([TILEGROUP_COMMON, TILEGROUP_NORTH, TILEGROUP_SOUTH]);
});

test.each(CUBES)(
    "the child levels of a cube tile are cached with the extents of the child segments, %o",
    (Strategy) => {
        const qts = createStrategy(Strategy),
            terrain = new CubeRgbTerrain(null, { url: URL }),
            levels = 2,
            gridSize = 1,
            tileLength = (gridSize + 1) * (gridSize + 1);

        for (const root of qts.quadTreeList) {
            subdivide(root, 1);
            const parent = root.nodes[2].segment; // SW, zoom 1
            subdivide(parent.node, 1 + levels);

            const heights = new Float32Array(tileLength * (1 + 4 + 16));
            terrain._cacheHeightsLevels(
                heights,
                { gridSize, levels },
                parent.tileGroup,
                parent.tileX,
                parent.tileY,
                parent.tileZoom,
                parent.getExtent()
            );

            const children = collect(parent.node).filter((s) => s !== parent);
            expect(children.length).toBe(4 + 16);

            for (const child of children) {
                const cache = terrain.getElevationCache(child.tileIndex);
                expect(cache.extent.equals(child.getExtent())).toBe(true);
            }
        }
    }
);

test("the child levels of a Mercator tile are cached with the Mercator extents as before", () => {
    const qts = createStrategy(EarthQuadTreeStrategy),
        terrain = new RgbTerrain(null, {}),
        merc = qts.quadTreeList[0];

    subdivide(merc, 3);
    const parent = merc.nodes[1].nodes[2].segment; // zoom 2

    terrain._cacheHeightsLevels(
        new Float32Array(4 * 21),
        { gridSize: 1, levels: 2 },
        parent.tileGroup,
        parent.tileX,
        parent.tileY,
        parent.tileZoom,
        parent.getExtent()
    );

    for (let k = 1; k <= 2; k++) {
        const d = 1 << k;
        for (let i = 0; i < d; i++) {
            for (let j = 0; j < d; j++) {
                const x = parent.tileX * d + j,
                    y = parent.tileY * d + i,
                    z = parent.tileZoom + k,
                    e = terrain.getElevationCache(Layer.getTileIndex(x, y, z, TILEGROUP_COMMON)).extent,
                    m = getTileExtent(x, y, z);
                expect(e.southWest.lon).toBeCloseTo(m.southWest.lon, 6);
                expect(e.southWest.lat).toBeCloseTo(m.southWest.lat, 6);
                expect(e.northEast.lon).toBeCloseTo(m.northEast.lon, 6);
                expect(e.northEast.lat).toBeCloseTo(m.northEast.lat, 6);
            }
        }
    }
});

const POINTS = [
    new LonLat(0, 0), // the middle of the front face
    new LonLat(37.3, 12.1),
    new LonLat(-120.5, -33.3),
    new LonLat(10, 89.9), // the north pole
    new LonLat(-170, -89.5), // the south pole
    new LonLat(45, 10), // the edge of the front and right faces
    new LonLat(179.99, 5), // the antimeridian
    new LonLat(30, 35.26) // near the corner of the top, front and right faces
];

test.each(CUBES)(
    "getHeightAsync reads the pixel under the point from the {f} tile of maxNativeZoom, %o",
    async (Strategy) => {
        const { qts, terrain } = createCubeTerrain(Strategy),
            proj = qts.projection,
            z = terrain.maxNativeZoom,
            pz = pow2i(z);

        for (const p of POINTS) {
            terrain.clearCache();
            terrain._loader.fetch.mockClear();

            let height;
            terrain.getHeightAsync(p, (h) => (height = h));
            await flush();

            // The pixel is found by hand with the projection of the strategy
            const n = proj.fromLonLat(p),
                face = Math.floor(n.lon),
                u = (n.lon - face) * pz,
                v = (1 - n.lat) * pz,
                x = Math.floor(u),
                y = Math.min(Math.floor(v), pz - 1),
                col = Math.min(Math.floor((u - x) * SIZE), SIZE - 1),
                row = Math.min(Math.floor((v - y) * SIZE), SIZE - 1);

            expect(terrain._loader.fetch).toHaveBeenCalledTimes(1);
            expect(terrain._loader.fetch.mock.calls[0][0].src).toBe(`./dem/${face}/${z}/${x}/${y}.webp`);
            expect(pixelOfHeight(height)).toBe(row * SIZE + col);

            // The node of the point is on the same tile
            expect(qts.getNodeByLonLat(p).segment.tileGroup).toBe(face);
        }
    }
);

test("getHeightAsync takes the parent tile where the tile is not loaded", async () => {
    const { terrain } = createCubeTerrain(CubeQuadTreeStrategy);
    terrain._loader.fetch.mockImplementation((params) =>
        Promise.resolve(params.src.includes("/5/") ? { status: "error" } : { status: "ready", data: {} })
    );

    let height;
    terrain.getHeightAsync(new LonLat(10, 10), (h) => (height = h));
    await flush();
    await flush();

    expect(terrain._loader.fetch.mock.calls.map((c) => c[0].src.split("/")[3])).toEqual(["5", "4"]);
    expect(height).toBeGreaterThan(-10000);
});

// The terrain loads the segments by loadTerrain, the response of a tile is response(src), the heights given to the
// segments are recorded. The deferred responses come with flushLoads().
function createLoadingTerrain(
    response = () => ({ status: "ready", data: {} }),
    { deferred = false, maxZoom = 7, maxNativeZoom = 5, loadEveryZoom = true } = {}
) {
    const { qts, terrain } = createCubeTerrain(CubeQuadTreeStrategy, { maxZoom, maxNativeZoom, loadEveryZoom }),
        applied = new Map(),
        loads = [];

    terrain._planet.terrainLock = { isFree: () => true };
    terrain._loader.load = vi.fn((params, callback) => {
        const respond = () => callback(response(params.src));
        deferred ? loads.push(respond) : respond();
    });
    terrain._applyElevationsData = vi.fn((segment, heights) => applied.set(segment, heights));

    const flushLoads = () => loads.splice(0).forEach((respond) => respond());

    // The first child of every node of the face 1 down to maxZoom
    let node = qts.quadTreeList[1];
    const branch = [node.segment];
    while (node.segment.tileZoom < terrain.maxZoom) {
        node.createChildNodes();
        node = node.nodes[0];
        branch.push(node.segment);
    }

    const requested = () => terrain._loader.load.mock.calls.map((c) => c[0].src.split("/")[3]);
    const cached = (s) => terrain.getElevationCache(s.tileIndex).heights;

    return { terrain, branch, applied, requested, cached, flushLoads };
}

const notFoundOn = (...zooms) => (src) =>
    zooms.includes(Number(src.split("/")[3])) ? { status: "error", statusCode: 404 } : { status: "ready", data: {} };

// The server has not the tile of the segment, and its heights are not cached anymore
function forget(terrain, segment) {
    terrain._tileStatus.set(segment.tileIndex, false);
    terrain._elevationCache.delete(segment.tileIndex);
}

// As destroySegment does
function destroy(segment) {
    segment.plainReady = false;
    segment.terrainIsLoading = false;
    segment.node = null;
    segment._extent = null;
}

test("every tile is requested once, a loaded one is taken from the cache", () => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(),
        segments = branch.slice(3, 7);

    segments.forEach((s) => terrain.loadTerrain(s));
    expect(requested()).toEqual(["3", "4", "5", "6"]);
    segments.forEach((s) => expect(applied.get(s)).toBe(cached(s)));

    segments.forEach((s) => terrain.loadTerrain(s));
    expect(requested()).toEqual(["3", "4", "5", "6"]);
});

test.each([false, true])("loadEveryZoom %s: the native tiles the level of their parent stands for are loaded or not", (loadEveryZoom) => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(undefined, { loadEveryZoom }),
        segments = branch.slice(2, 7);

    terrain.loadTerrain(segments[0]);
    const level3 = cached(segments[1]);

    segments.slice(1).forEach((s) => terrain.loadTerrain(s));

    if (loadEveryZoom) {
        expect(requested()).toEqual(["2", "3", "4", "5", "6"]);
        expect(applied.get(segments[1])).not.toBe(level3);
    } else {
        // The zoom 3 tile is the level of the zoom 2 one, maxNativeZoom 5 and the deeper ones are loaded
        expect(requested()).toEqual(["2", "4", "5", "6"]);
        expect(applied.get(segments[1])).toBe(level3);
    }
});

test("not every zoom is loaded by default", () => {
    expect(new CubeRgbTerrain(null, { url: URL }).loadEveryZoom).toBe(false);
    expect(new CubeRgbTerrain(null, { url: URL, loadEveryZoom: true }).loadEveryZoom).toBe(true);
});

test("a tile is requested over the level of its parent, its own heights replace the level", () => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(),
        [s4, s5] = branch.slice(4);

    terrain.loadTerrain(s4);
    const level5 = cached(s5);

    terrain.loadTerrain(s5);
    expect(requested()).toEqual(["4", "5"]);
    expect(cached(s5)).not.toBe(level5);
    expect(applied.get(s5)).toBe(cached(s5));
});

test("the level of a parent tile replaces neither a loaded tile nor the level of a nearer loaded parent", () => {
    const { terrain, branch, requested, cached } = createLoadingTerrain(notFoundOn(7)),
        [s5, s6, s7] = branch.slice(5);

    [s5, s6, s7].forEach((s) => terrain.loadTerrain(s));
    const own6 = cached(s6),
        level7 = cached(s7);

    // The zoom 7 tile is missing, its level is the one of the nearest loaded parent
    expect(level7.buffer).toBe(own6.buffer);

    // The zoom 5 tile made again
    terrain._elevationCache.delete(s5.tileIndex);
    terrain.loadTerrain(s5);
    expect(requested()).toEqual(["5", "6", "7", "5"]);
    expect(cached(s6)).toBe(own6);
    expect(cached(s7)).toBe(level7);
});

test("a tile the server has not, on any zoom, takes the level of the nearest loaded parent and is not requested again", () => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(notFoundOn(4)),
        [s3, s4] = branch.slice(3);

    terrain.loadTerrain(s3);
    const level4 = cached(s4);

    terrain.loadTerrain(s4);
    expect(applied.get(s4)).toBe(level4);

    terrain.loadTerrain(s4);
    expect(requested()).toEqual(["3", "4"]);

    // clearCache forgets the tiles the server has not
    terrain.clearCache();
    terrain.loadTerrain(s4);
    expect(requested()).toEqual(["3", "4", "4", "3"]);
});

test("with no tiles deeper than a zoom the segments take the levels of the last tile, every tile is requested once", () => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(notFoundOn(6, 7)),
        [s5, s6] = branch.slice(5),
        // The zoom 6 and 7 segments under the zoom 5 one
        deeper = [...s5.node.nodes, ...s6.node.nodes].map((n) => n.segment);

    terrain.loadTerrain(s5);
    const levels = deeper.map((s) => cached(s));

    deeper.forEach((s) => terrain.loadTerrain(s));
    deeper.forEach((s, i) => expect(applied.get(s)).toBe(levels[i]));

    deeper.forEach((s) => terrain.loadTerrain(s));
    expect(requested()).toEqual(["5", ...deeper.map((s) => String(s.tileZoom))]);
});

test("the levels of the segments with no tile that are not cached anymore are made again of the parent tile, once", () => {
    const { terrain, branch, applied, requested, cached, flushLoads } = createLoadingTerrain(undefined, {
            deferred: true
        }),
        s5 = branch[5];

    terrain.loadTerrain(s5);
    flushLoads();

    const children = s5.node.nodes.map((n) => n.segment);
    children.forEach((s) => forget(terrain, s));

    children.forEach((s) => terrain.loadTerrain(s));
    expect(requested()).toEqual(["5", "5"]);
    expect(children.some((s) => applied.has(s))).toBe(false);

    flushLoads();
    for (const s of children) {
        expect(applied.get(s)).toBeInstanceOf(Float32Array);
        expect(applied.get(s)).toBe(cached(s));
    }
    expect(terrain._parentLevelsWaiting.size).toBe(0);
});

test("the parent tile of a segment with no tile is the nearest loaded one", () => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(),
        [s5, s6, s7] = branch.slice(5);

    terrain.loadTerrain(s5);
    forget(terrain, s6);
    forget(terrain, s7);

    terrain.loadTerrain(s7);
    expect(requested()).toEqual(["5", "5"]);
    expect(applied.get(s7)).toBe(cached(s7));
});

test.each([false, true])(
    "loadEveryZoom %s: two missing zooms in a row under a native tile take its level, it is the nearest loaded parent",
    (loadEveryZoom) => {
        const { terrain, branch, applied, requested, cached } = createLoadingTerrain(notFoundOn(3, 4), {
                loadEveryZoom
            }),
            [s2, s3, s4] = branch.slice(2);

        [s2, s3, s4].forEach((s) => terrain.loadTerrain(s));

        // Not every zoom loaded, the zoom 3 tile is the level of the zoom 2 one, it is found missing when
        // it is loaded again for the zoom 4 segment, then the zoom 2 one is
        expect(requested()).toEqual(loadEveryZoom ? ["2", "3", "4"] : ["2", "4", "3", "2"]);
        expect(applied.get(s4)).toBeInstanceOf(Float32Array);
        expect(applied.get(s4)).toBe(cached(s4));
        expect(cached(s4).buffer).toBe(cached(s2).buffer);

        [s3, s4].forEach((s) => terrain.loadTerrain(s));
        expect(requested().length).toBe(loadEveryZoom ? 3 : 4);
    }
);

test("maxNativeZoom deeper than the tiles of the server: the segments under the last tile take its levels", () => {
    // The Moon example, the tiles are up to the zoom 5
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain(notFoundOn(6, 7), {
            loadEveryZoom: false,
            maxNativeZoom: 14
        }),
        [s4, s5, s6, s7] = branch.slice(4);

    [s4, s5, s6, s7].forEach((s) => terrain.loadTerrain(s));

    // The zoom 5 tile is the level of the zoom 4 one, it is loaded for the missing zoom 6 one with the zoom 7 level
    expect(requested()).toEqual(["4", "6", "5"]);
    for (const s of [s6, s7]) {
        expect(applied.get(s)).toBeInstanceOf(Float32Array);
        expect(applied.get(s)).toBe(cached(s));
        expect(cached(s).buffer).toBe(cached(s5).buffer);
    }
});

test("a segment deeper than the levels of the nearest parent tile takes the parent mesh, nothing is loaded", () => {
    const { terrain, branch, applied, requested } = createLoadingTerrain(undefined, { maxZoom: 8 }),
        [s5, s6, s7, s8] = branch.slice(5);

    terrain.loadTerrain(s5);
    [s6, s7, s8].forEach((s) => forget(terrain, s));

    // The zoom 5 tile has two levels, the zoom 8 one is three zooms deeper
    terrain.loadTerrain(s8);
    expect(requested()).toEqual(["5"]);
    expect(applied.get(s8)).toBe(null);
});

test("the tile of a segment destroyed while it was loading changes nothing, found or not", () => {
    let missingSrc;
    const { terrain, branch, applied, requested, flushLoads } = createLoadingTerrain(
            (src) => (src === missingSrc ? { status: "error", statusCode: 404 } : { status: "ready", data: {} }),
            { deferred: true }
        ),
        s5 = branch[5],
        [notFound, found] = s5.node.nodes.map((n) => n.segment);

    missingSrc = terrain.buildURL(notFound.tileX, notFound.tileY, 6, 1);

    terrain.loadTerrain(s5);
    flushLoads();
    terrain._elevationCache.delete(notFound.tileIndex);

    terrain.loadTerrain(notFound);
    terrain.loadTerrain(found);
    destroy(notFound);
    destroy(found);

    expect(() => flushLoads()).not.toThrow();
    // No parent tile is loaded for the destroyed segment
    expect(requested()).toEqual(["5", "6", "6"]);
    expect(applied.has(found)).toBe(false);
});

test("the parent tile destroyed while it loads again still makes the heights of the waiting segment", () => {
    const { terrain, branch, applied, cached, flushLoads } = createLoadingTerrain(undefined, { deferred: true }),
        [s5, s6] = branch.slice(5);

    terrain.loadTerrain(s5);
    flushLoads();
    forget(terrain, s6);

    terrain.loadTerrain(s6);
    destroy(s5);

    expect(() => flushLoads()).not.toThrow();
    expect(applied.get(s6)).toBe(cached(s6));
});

test("the segments waiting for an aborted parent tile load again", () => {
    let abort = false;
    const { terrain, branch, applied, requested, cached, flushLoads } = createLoadingTerrain(
            (src) => (abort && src.includes("/5/") ? { status: "abort" } : { status: "ready", data: {} }),
            { deferred: true }
        ),
        [s5, s6] = branch.slice(5);

    terrain.loadTerrain(s5);
    flushLoads();
    forget(terrain, s6);

    abort = true;
    terrain.loadTerrain(s6);
    flushLoads();
    expect(s6.terrainIsLoading).toBe(false);
    expect(applied.has(s6)).toBe(false);
    expect(terrain._parentLevelsWaiting.size).toBe(0);

    abort = false;
    terrain.loadTerrain(s6);
    flushLoads();
    expect(requested()).toEqual(["5", "5", "5"]);
    expect(applied.get(s6)).toBe(cached(s6));
});

test.each([
    ["a failed request", { status: "error" }],
    ["a server error", { status: "error", statusCode: 503 }]
])("a tile of %s takes the level of the parent tile and is requested again", (_, error) => {
    const { terrain, branch, applied, requested, cached } = createLoadingTerrain((src) =>
            src.includes("/6/") ? error : { status: "ready", data: {} }
        ),
        [s5, s6] = branch.slice(5);

    terrain.loadTerrain(s5);
    terrain.loadTerrain(s6);
    expect(applied.get(s6)).toBe(cached(s6));

    terrain.loadTerrain(s6);
    expect(requested()).toEqual(["5", "6", "6"]);
});

test("CubeRgbTerrain has no geoid unless it is given, RgbTerrain keeps the Earth one", () => {
    expect(new CubeRgbTerrain(null, { url: URL }).geoid.src).toBe(null);
    expect(new CubeRgbTerrain(null, { url: URL, geoidSrc: "./g.pgm" }).geoid.src).toBe("./g.pgm");
    expect(new RgbTerrain(null, {}).geoid.src).toBe("https://openglobus.org/geoid/egm84-30.pgm");
});
