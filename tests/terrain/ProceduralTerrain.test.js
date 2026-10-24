import { ProceduralTerrain } from "../../src/terrain/ProceduralTerrain";
import { createHeightsLevels, TERRAIN_GRID_SIZE_BY_ZOOM } from "../../src/terrain/terrainUtils";
import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { LonLat } from "../../src/LonLat";
import * as mercator from "../../src/mercator";
import { Extent } from "../../src/Extent";
import { Segment } from "../../src/segment/Segment";
import { SegmentLonLatEqui } from "../../src/segment/SegmentLonLatEqui";
import { Layer } from "../../src/layer/Layer";

const tile = { tileIndex: "0::0_0_0" };

const toGridHeights = (heights) =>
    new ProceduralTerrain(null, { plainGridSize: 4, getHeights: () => heights })._toGridHeights(tile, heights);

test("ProceduralTerrain takes grid size heights as they are", () => {
    const heights = new Float32Array(25).map((_, k) => k);
    expect(toGridHeights(heights)).toBe(heights);
});

test("ProceduralTerrain reduces larger vertex grids keeping peaks", () => {
    // 9x9 vertices with a peak between the 5x5 grid vertices
    const heights = new Array(81).fill(0);
    heights[3 * 9 + 3] = 10;

    const out = toGridHeights(heights);

    expect(out.length).toBe(25);
    expect(Math.max(...out)).toBe(10);
});

test("ProceduralTerrain takes 2^n x 2^n heights as pixels keeping peaks", () => {
    const heights = new Float32Array(64).fill(-10);
    heights[2 * 8 + 5] = -9.5;

    const out = toGridHeights(heights);

    expect(out.length).toBe(25);
    expect(Math.max(...out)).toBe(-9.5);
});

test("ProceduralTerrain has no terrain for null and unexpected sizes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(toGridHeights(null)).toBe(null);
    expect(warn).not.toHaveBeenCalled();

    // Not a square, not 2^n or (2^n + 1), smaller than the grid
    for (const length of [30, 100, 9]) {
        expect(toGridHeights(new Float32Array(length))).toBe(null);
    }
    expect(warn).toHaveBeenCalledTimes(3);

    warn.mockRestore();
});

// Planet with a single quad tree root of the segment class and no segments under it
function createPlanet(SegmentPrototype, extent) {
    const quadTreeStrategy = {
        planet: { renderer: { handler: {} }, terrain: { gridSizeByZoom: [] } },
        _quadTreeList: [],
        getNodeByLonLat: QuadTreeStrategy.prototype.getNodeByLonLat
    };

    const root = { nodes: [], SegmentPrototype, quadTreeStrategy };
    root.segment = new SegmentPrototype(root, quadTreeStrategy, 0, extent);
    root.segment._setExtentLonLat();
    quadTreeStrategy._quadTreeList.push(root);

    return { quadTreeStrategy };
}

// Heights grow to the east from the segment edge, by one in a native projection unit
function createEastHeights(segment) {
    const e = segment.getExtent(),
        step = e.getWidth() / 4,
        heights = new Float32Array(25);
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            heights[i * 5 + j] = j * step;
        }
    }
    return heights;
}

test("ProceduralTerrain getHeightAsync makes the Mercator segment heights out of the quad tree once", () => {
    const zoom = 10,
        x = 600,
        y = 380;

    const getHeights = vi.fn(createEastHeights);
    const terrain = new ProceduralTerrain(null, { plainGridSize: 4, maxZoom: zoom, getHeights });
    terrain._planet = createPlanet(
        Segment,
        new Extent(new LonLat(-mercator.POLE, -mercator.POLE), new LonLat(mercator.POLE, mercator.POLE))
    );

    const e = mercator.getTileExtent(x, y, zoom);
    const point = new LonLat(e.southWest.lon + e.getWidth() * 0.3, e.southWest.lat + e.getHeight() * 0.6);

    const heights = [];
    terrain.getHeightAsync(point.inverseMercator(), (h) => heights.push(h));
    terrain.getHeightAsync(point.inverseMercator(), (h) => heights.push(h));

    expect(getHeights).toHaveBeenCalledTimes(1);
    expect(getHeights.mock.calls[0][0]).toBeInstanceOf(Segment);
    expect(getHeights.mock.calls[0][0].node).toBe(null);
    expect(getHeights.mock.calls[0][0].tileIndex).toBe(`0::${x}_${y}_${zoom}`);
    expect(heights[0]).toBeCloseTo(point.lon - e.southWest.lon, 0);
    expect(heights[1]).toBe(heights[0]);
});

test("ProceduralTerrain getHeightAsync works in degrees with not square segments", () => {
    const zoom = 2;

    const getHeights = vi.fn(createEastHeights);
    const terrain = new ProceduralTerrain(null, { plainGridSize: 4, maxZoom: zoom, getHeights });
    terrain._planet = createPlanet(SegmentLonLatEqui, new Extent(new LonLat(-180, -90), new LonLat(180, 90)));

    // 90 x 45 degrees segments, the point is in x = 2, y = 1
    let height;
    terrain.getHeightAsync(new LonLat(30, 10), (h) => (height = h));

    const segment = getHeights.mock.calls[0][0];
    expect(segment).toBeInstanceOf(SegmentLonLatEqui);
    expect(segment.tileIndex).toBe(`0::2_1_${zoom}`);
    expect(segment.getExtentLonLat().southWest.lat).toBe(0);
    expect(height).toBeCloseTo(30, 4);
});

test("ProceduralTerrain dispatches load before applying heights, and loadend when the terrain is completed", () => {
    const frames = [];
    vi.stubGlobal("requestAnimationFrame", (f) => frames.push(f));
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const heights = new Float32Array(25);
    const terrain = new ProceduralTerrain(null, { plainGridSize: 4, getHeights: () => heights });
    const quadTreeStrategy = { _terrainCompletedActivated: false };
    terrain._planet = { terrainLock: { isFree: () => true }, quadTreeStrategy };

    const createSegment = (tileIndex) => ({
        tileIndex,
        plainReady: true,
        getExtent: () => null,
        applyTerrain: vi.fn()
    });
    const segments = [createSegment("0::1_1_1"), createSegment("0::2_1_1")];

    const load = vi.fn((e) => expect(e.segment.applyTerrain).not.toHaveBeenCalled());
    const loadend = vi.fn();
    terrain.events.on("load", load);
    terrain.events.on("loadend", loadend);

    terrain.loadTerrain(segments[0]);
    terrain.loadTerrain(segments[1]);

    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[0][0]).toEqual({ elevations: heights, segment: segments[0] });
    expect(segments[1].applyTerrain).toHaveBeenCalledWith(heights);
    // One loadend check for all the loads
    expect(frames.length).toBe(1);

    // The terrain is not completed yet
    frames.shift()();
    expect(loadend).not.toHaveBeenCalled();
    expect(frames.length).toBe(1);

    quadTreeStrategy._terrainCompletedActivated = true;
    frames.shift()();
    expect(loadend).toHaveBeenCalledTimes(1);
    expect(loadend).toHaveBeenCalledWith(terrain);
    expect(frames.length).toBe(0);

    vi.unstubAllGlobals();
});

test("ProceduralTerrain segment grid sizes by zoom are the elevation terrains ones by default", () => {
    const getHeights = () => null;
    expect(new ProceduralTerrain(null, { getHeights }).gridSizeByZoom).toEqual(TERRAIN_GRID_SIZE_BY_ZOOM);
    expect(new ProceduralTerrain(null, { getHeights, gridSizeByZoom: [8, 8] }).gridSizeByZoom).toEqual([8, 8]);
});

// Promise resolved by the test
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function createLoadingTerrain(getHeights) {
    const terrain = new ProceduralTerrain(null, { plainGridSize: 4, getHeights });
    terrain._planet = { terrainLock: { isFree: () => true }, quadTreeStrategy: { _terrainCompletedActivated: true } };
    return terrain;
}

const createSegment = (tileIndex) => ({ tileIndex, plainReady: true, getExtent: () => null, applyTerrain: vi.fn() });

test("ProceduralTerrain applies promised heights when they are made, once for a tile", async () => {
    const heights = new Float32Array(25),
        request = deferred(),
        getHeights = vi.fn(() => request.promise),
        terrain = createLoadingTerrain(getHeights);

    const load = vi.fn();
    terrain.events.on("load", load);

    const segments = [createSegment("0::1_1_1"), createSegment("0::1_1_1")];
    terrain.loadTerrain(segments[0]);
    terrain.loadTerrain(segments[1]);

    expect(getHeights).toHaveBeenCalledTimes(1);
    expect(terrain.loader.loading).toBe(1);
    expect(segments[0].applyTerrain).not.toHaveBeenCalled();

    request.resolve(heights);
    await request.promise;
    await Promise.resolve();
    await Promise.resolve();

    expect(terrain.loader.loading).toBe(0);
    expect(segments[0].applyTerrain).toHaveBeenCalledWith(heights);
    expect(segments[1].applyTerrain).toHaveBeenCalledWith(heights);
    expect(load).toHaveBeenCalledTimes(2);

    // Cached
    terrain.loadTerrain(createSegment("0::1_1_1"));
    expect(getHeights).toHaveBeenCalledTimes(1);
});

test("ProceduralTerrain does not apply promised heights out of the planet, and requests failed heights again", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const requests = [deferred(), deferred()],
        getHeights = vi.fn(() => requests[getHeights.mock.calls.length - 1].promise),
        terrain = createLoadingTerrain(getHeights);

    const segment = createSegment("0::1_1_1");
    terrain.loadTerrain(segment);
    requests[0].reject(new Error("no heights"));
    await requests[0].promise.catch(() => {});
    await Promise.resolve();
    await Promise.resolve();

    expect(error).toHaveBeenCalled();
    expect(segment.applyTerrain).toHaveBeenCalledWith(null);
    expect(terrain.loader.loading).toBe(0);

    const other = createSegment("0::1_1_1");
    terrain.loadTerrain(other);
    expect(getHeights).toHaveBeenCalledTimes(2);

    terrain._planet = null;
    requests[1].resolve(new Float32Array(25));
    await requests[1].promise;
    await Promise.resolve();
    await Promise.resolve();

    expect(other.applyTerrain).not.toHaveBeenCalled();

    error.mockRestore();
});

test("ProceduralTerrain getHeightAsync calls back when the promised heights are made", async () => {
    const zoom = 2,
        request = deferred();

    const terrain = new ProceduralTerrain(null, {
        plainGridSize: 4,
        maxZoom: zoom,
        getHeights: (segment) => request.promise.then(() => createEastHeights(segment))
    });
    terrain._planet = createPlanet(SegmentLonLatEqui, new Extent(new LonLat(-180, -90), new LonLat(180, 90)));

    const callback = vi.fn();
    expect(terrain.getHeightAsync(new LonLat(30, 10), callback)).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    request.resolve();
    await request.promise;
    for (let i = 0; i < 4; i++) {
        await Promise.resolve();
    }

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBeCloseTo(30, 4);

    // Ready now
    expect(terrain.getHeightAsync(new LonLat(30, 10), callback)).toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);
});

// Heights grow to the east from the segment edge in 8 x 8 pixels, by one in a native projection unit
function createEastPixels(segment) {
    const e = segment.getExtent(),
        step = e.getWidth() / 8,
        heights = new Float32Array(64);
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            heights[i * 8 + j] = (j + 0.5) * step;
        }
    }
    return heights;
}

// Tile of a 16 x 8 world with two tiles of the zoom 1, in the quad tree under the native tile when it is given
function createLevelTile(x, y, z, native = null) {
    const w = 16 / 2 ** z;
    return {
        tileX: x,
        tileY: y,
        tileZoom: z,
        _tileGroup: 0,
        tileIndex: Layer.getTileIndex(x, y, z, 0),
        node: native && { segment: { tileZoom: z }, parentNode: { segment: native } },
        getExtent: () => new Extent(new LonLat(x * w, 8 - (y + 1) * w), new LonLat((x + 1) * w, 8 - y * w))
    };
}

// 8x8 seabed at -10m with a 0.5m stone at the pixel (2, 5)
function createStonePixels() {
    const pixels = new Float32Array(64).fill(-10);
    pixels[2 * 8 + 5] = -9.5;
    return pixels;
}

test("ProceduralTerrain segments deeper than maxNativeZoom are the native segment levels, its pixels keep heights", () => {
    const getHeights = vi.fn(createStonePixels);
    const terrain = new ProceduralTerrain(null, { plainGridSize: 4, maxZoom: 4, maxNativeZoom: 1, getHeights });

    // The native tile x = 1, y = 0 of the zoom 1, reached from its zoom 3 tile in the quad tree
    const native = createLevelTile(1, 0, 1);
    const tile = terrain._getSegmentHeights(createLevelTile(6, 1, 3, native));

    expect(getHeights).toHaveBeenCalledTimes(1);
    expect(getHeights.mock.calls[0][0]).toBe(native);

    // Two pixels of the zoom 3 tile by side, the stone pixel center is its vertex (1, 3)
    expect(tile.extent.southWest.lon).toBe(12);
    expect(tile.extent.northEast.lat).toBe(6);
    expect(tile.heights.length).toBe(25);
    expect(tile.heights[1 * 5 + 3]).toBe(-9.5);

    // Only the native tile and the asked level tile are made, the native pixels are kept
    expect(terrain.getCacheInfo()).toEqual({ tiles: 2, native: 1 });

    // Levels end at the vertex grid, two vertices by pixel
    expect(terrain._getSegmentHeights(createLevelTile(12, 2, 4, native)).heights).toBe(null);
    expect(getHeights).toHaveBeenCalledTimes(1);
});

test("ProceduralTerrain requests the native pixels again when they are dropped from the cache", () => {
    const getHeights = vi.fn(createStonePixels);
    const terrain = new ProceduralTerrain(null, {
        plainGridSize: 4,
        maxZoom: 4,
        maxNativeZoom: 1,
        nativeCacheSize: 1,
        getHeights
    });

    const west = createLevelTile(0, 0, 1),
        east = createLevelTile(1, 0, 1);

    terrain._getSegmentHeights(createLevelTile(0, 0, 2, west));
    terrain._getSegmentHeights(createLevelTile(2, 0, 2, east));

    expect(getHeights.mock.calls.map((c) => c[0])).toEqual([west, east]);
    expect(terrain.getCacheInfo().native).toBe(1);

    // The west tile pixels and heights are dropped, made level tiles stay
    expect(terrain._getSegmentHeights(createLevelTile(0, 0, 2, west)).heights).not.toBe(null);
    expect(getHeights).toHaveBeenCalledTimes(2);

    const tile = terrain._getSegmentHeights(createLevelTile(2, 1, 3, west));

    expect(getHeights).toHaveBeenCalledTimes(3);
    expect(getHeights.mock.calls[2][0]).toBe(west);
    expect(tile.heights[1 * 5 + 3]).toBe(-9.5);
});

test("ProceduralTerrain level tiles are the same as createHeightsLevels makes", () => {
    const pixels = createStonePixels(),
        terrain = new ProceduralTerrain(null, {
            plainGridSize: 4,
            maxZoom: 4,
            maxNativeZoom: 1,
            getHeights: () => pixels
        }),
        native = createLevelTile(1, 0, 1),
        all = createHeightsLevels(8, 4, 2, (row, out) => out.set(pixels.subarray(row * 8, row * 8 + 8)), NaN),
        tile = (n) => Array.from(all.subarray(n * 25, (n + 1) * 25));

    expect(Array.from(terrain._getSegmentHeights(native).heights)).toEqual(tile(0));
    // Level 1, row 1, column 0
    expect(Array.from(terrain._getSegmentHeights(createLevelTile(2, 1, 2, native)).heights)).toEqual(tile(1 + 2));
    // Level 2, row 1, column 2
    expect(Array.from(terrain._getSegmentHeights(createLevelTile(6, 1, 3, native)).heights)).toEqual(tile(1 + 4 + 6));
});

test("ProceduralTerrain getHeightAsync deeper than maxNativeZoom takes the level heights out of the quad tree", () => {
    const zoom = 10,
        x = 600,
        y = 380;

    const getHeights = vi.fn(createEastPixels);
    const terrain = new ProceduralTerrain(null, {
        plainGridSize: 4,
        maxZoom: zoom + 2,
        maxNativeZoom: zoom,
        getHeights
    });
    terrain._planet = createPlanet(
        Segment,
        new Extent(new LonLat(-mercator.POLE, -mercator.POLE), new LonLat(mercator.POLE, mercator.POLE))
    );

    const e = mercator.getTileExtent(x, y, zoom);
    const point = new LonLat(e.southWest.lon + e.getWidth() * 0.3, e.southWest.lat + e.getHeight() * 0.6);

    let height;
    expect(terrain.getHeightAsync(point.inverseMercator(), (h) => (height = h))).toBe(true);

    expect(getHeights).toHaveBeenCalledTimes(1);
    expect(getHeights.mock.calls[0][0].node).toBe(null);
    expect(getHeights.mock.calls[0][0].tileIndex).toBe(`0::${x}_${y}_${zoom}`);
    expect(height).toBeCloseTo(point.lon - e.southWest.lon, 0);
});

test("ProceduralTerrain getHeightAsync deeper than the levels takes the height of the level above", () => {
    const zoom = 10,
        x = 600,
        y = 380;

    // Grid size heights have no levels
    const getHeights = vi.fn(createEastHeights);
    const terrain = new ProceduralTerrain(null, {
        plainGridSize: 4,
        maxZoom: zoom + 2,
        maxNativeZoom: zoom,
        getHeights
    });
    terrain._planet = createPlanet(
        Segment,
        new Extent(new LonLat(-mercator.POLE, -mercator.POLE), new LonLat(mercator.POLE, mercator.POLE))
    );

    const e = mercator.getTileExtent(x, y, zoom);
    const point = new LonLat(e.southWest.lon + e.getWidth() * 0.3, e.southWest.lat + e.getHeight() * 0.6);

    let height;
    terrain.getHeightAsync(point.inverseMercator(), (h) => (height = h));

    expect(getHeights).toHaveBeenCalledTimes(1);
    expect(height).toBeCloseTo(point.lon - e.southWest.lon, 0);
});
