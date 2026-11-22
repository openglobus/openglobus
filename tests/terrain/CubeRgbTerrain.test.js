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

test("CubeRgbTerrain has no geoid unless it is given, RgbTerrain keeps the Earth one", () => {
    expect(new CubeRgbTerrain(null, { url: URL }).geoid.src).toBe(null);
    expect(new CubeRgbTerrain(null, { url: URL, geoidSrc: "./g.pgm" }).geoid.src).toBe("./g.pgm");
    expect(new RgbTerrain(null, {}).geoid.src).toBe("https://openglobus.org/geoid/egm84-30.pgm");
});
