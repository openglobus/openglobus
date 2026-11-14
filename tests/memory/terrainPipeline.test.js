import { beforeAll, describe, test, expect, vi } from "vitest";
import { getMeshHeights } from "../../src/terrain/terrainUtils";
import { getTileExtent } from "../../src/mercator";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Segment } from "../../src/segment/Segment";

//
// The mesh the segments are drawn and intersected with (Segment.getTerrainPoint reads renderVertices only)
// does not depend on what the workers keep of the elevation grid.
//

const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
await import("../../src/utils/PlainSegmentWorker.worker.js");
const plainWorker = self.onmessage;
await import("../../src/utils/TerrainWorker.worker.js");
const terrainWorker = self.onmessage;

function run(worker, data) {
    post.mockClear();
    worker({ data });
    return post.mock.calls[0][0];
}

const MESH = 64,
    FILE = 256,
    NO_DATA = -10000;

// z13 tile with the Matterhorn
const extent = getTileExtent(4270, 2916, 13),
    center = wgs84.lonLatToCartesian(LonLat.inverseMercator(extent.getCenter().lon, extent.getCenter().lat));

// See createPlainSegmentParams
function createParams(gridSize) {
    const r2 = wgs84._invRadii2;
    return new Float64Array([
        1,
        0,
        gridSize,
        FILE,
        extent.southWest.lon,
        extent.southWest.lat,
        extent.northEast.lon,
        extent.northEast.lat,
        wgs84._e2,
        wgs84.equatorialSize,
        r2.x,
        r2.y,
        r2.z,
        1,
        center.x,
        center.y,
        center.z
    ]);
}

const plain = (gridSize) => run(plainWorker, { params: createParams(gridSize) });

const terrain = (elevations, gridSize = MESH) =>
    run(terrainWorker, {
        elevations,
        params: createParams(gridSize),
        heightFactor: 1,
        gridSize,
        noDataValues: [NO_DATA],
        id: 1
    });

const createElevations = () =>
    new Float32Array((FILE + 1) * (FILE + 1)).map(
        (_, k) =>
            3000 + 800 * Math.sin((k % (FILE + 1)) / 9) * Math.cos(Math.floor(k / (FILE + 1)) / 7) + 60 * Math.sin(k)
    );

// The point of the grid on the ellipsoid, raised by the height
function getPoint(gridSize, i, j, height = 0) {
    const ll = LonLat.inverseMercator(
        extent.southWest.lon + (j * extent.getWidth()) / gridSize,
        extent.northEast.lat - (i * extent.getHeight()) / gridSize
    );
    ll.height = height;
    return wgs84.lonLatToCartesian(ll);
}

const worstDistance = (a, b) => {
    let worst = 0;
    for (let k = 0; k < a.length; k += 3) {
        worst = Math.max(worst, Math.hypot(a[k] - b[k], a[k + 1] - b[k + 1], a[k + 2] - b[k + 2]));
    }
    return worst;
};

describe("plain segment mesh", () => {
    const p = plain(MESH),
        gs = MESH + 1;

    test("is the mesh grid only", () => {
        expect(Object.keys(p).sort()).toEqual(
            [
                "geoidId",
                "id",
                "plainNormals",
                "plainVertices",
                "plainVerticesHigh",
                "plainVerticesLow",
                "relativeCenter"
            ].sort()
        );
        expect(p.plainVertices.length).toBe(gs * gs * 3);
    });

    test("every vertex is the ellipsoid point, with the ellipsoid normal", () => {
        let worst = 0,
            worstSplit = 0,
            worstNormal = 0;

        for (let i = 0; i < gs; i++) {
            for (let j = 0; j < gs; j++) {
                const k = (i * gs + j) * 3,
                    ref = getPoint(MESH, i, j),
                    n = wgs84.getSurfaceNormal3v(ref);

                worst = Math.max(
                    worst,
                    Math.hypot(
                        p.plainVertices[k] + center.x - ref.x,
                        p.plainVertices[k + 1] + center.y - ref.y,
                        p.plainVertices[k + 2] + center.z - ref.z
                    )
                );

                worstNormal = Math.max(
                    worstNormal,
                    Math.hypot(p.plainNormals[k] - n.x, p.plainNormals[k + 1] - n.y, p.plainNormals[k + 2] - n.z)
                );

                for (let c = 0; c < 3; c++) {
                    worstSplit = Math.max(
                        worstSplit,
                        Math.abs(p.plainVerticesHigh[k + c] + p.plainVerticesLow[k + c] - p.plainVertices[k + c])
                    );
                }
            }
        }

        expect(worst).toBeLessThan(1e-6);
        expect(worstNormal).toBeLessThan(1e-6);
        expect(worstSplit).toBeLessThan(1e-2);
    });
});

describe("terrain mesh", () => {
    const meshHeights = getMeshHeights(createElevations(), FILE, MESH, NO_DATA),
        t = terrain(createElevations()),
        gs = MESH + 1;

    test("every vertex is the ellipsoid point raised by the mesh height", () => {
        let worst = 0,
            worstSplit = 0;

        for (let i = 0; i < gs; i++) {
            for (let j = 0; j < gs; j++) {
                const k = (i * gs + j) * 3,
                    ref = getPoint(MESH, i, j, meshHeights[i * gs + j]);

                worst = Math.max(
                    worst,
                    Math.hypot(
                        t.terrainVertices[k] + center.x - ref.x,
                        t.terrainVertices[k + 1] + center.y - ref.y,
                        t.terrainVertices[k + 2] + center.z - ref.z
                    )
                );

                // The buffers the GPU draws
                for (let c = 0; c < 3; c++) {
                    worstSplit = Math.max(
                        worstSplit,
                        Math.abs(t.terrainVerticesHigh[k + c] + t.terrainVerticesLow[k + c] - t.terrainVertices[k + c])
                    );
                }
            }
        }

        // The normals the heights go along are 32 bit floats
        expect(worst).toBeLessThan(2e-3);
        expect(worstSplit).toBeLessThan(1e-2);
    });

    test("the bounds hold all the vertices", () => {
        const [xmin, ymin, zmin, xmax, ymax, zmax] = t.bounds;
        for (let k = 0; k < t.terrainVertices.length; k += 3) {
            const x = t.terrainVertices[k] + center.x,
                y = t.terrainVertices[k + 1] + center.y,
                z = t.terrainVertices[k + 2] + center.z;
            expect(x >= xmin && x <= xmax && y >= ymin && y <= ymax && z >= zmin && z <= zmax).toBe(true);
        }
        expect(t.radiusRange[1]).toBeGreaterThan(t.radiusRange[0]);
        expect(t.lodRadius).toBeGreaterThanOrEqual(t.radiusRange[0]);
        expect(t.lodRadius).toBeLessThanOrEqual(t.radiusRange[1]);
        expect(t.relativeCenter).toEqual([center.x, center.y, center.z]);
    });
});

describe("normals of the normal map", () => {
    test("are in the elevation grid, finer than the mesh", () => {
        expect(terrain(createElevations()).normalMapNormals.length).toBe((FILE + 1) * (FILE + 1) * 3);
    });

    test("point up from the surface", () => {
        const normals = terrain(createElevations()).normalMapNormals;
        for (let i = 0; i <= FILE; i += 32) {
            for (let j = 0; j <= FILE; j += 32) {
                const k = (i * (FILE + 1) + j) * 3,
                    up = wgs84.getSurfaceNormal3v(getPoint(FILE, i, j)),
                    l = Math.hypot(normals[k], normals[k + 1], normals[k + 2]);
                expect((normals[k] * up.x + normals[k + 1] * up.y + normals[k + 2] * up.z) / l).toBeGreaterThan(0);
            }
        }
    });
});

describe("elevation grid vertices", () => {
    test("are not kept for a tile its children are cut from the mesh of", () => {
        expect(terrain(createElevations(), 64).normalMapVertices).toBe(null);
        expect(terrain(createElevations(), 4).normalMapVertices).toBe(null);
    });

    test("are kept for a tile with a mesh of 1 or 2 cells, Node.whileTerrainLoading cuts the children from them", () => {
        const elevations = createElevations();

        for (const gridSize of [1, 2]) {
            const v = terrain(createElevations(), gridSize).normalMapVertices;

            expect(v.length).toBe((FILE + 1) * (FILE + 1) * 3);

            for (const [i, j] of [
                [0, 0],
                [37, 201],
                [256, 256]
            ]) {
                const k = (i * (FILE + 1) + j) * 3,
                    ref = getPoint(FILE, i, j, elevations[i * (FILE + 1) + j]);
                expect(
                    Math.hypot(v[k] + center.x - ref.x, v[k + 1] + center.y - ref.y, v[k + 2] + center.z - ref.z)
                ).toBeLessThan(2e-3);
            }
        }
    });
});

describe("normals of a tile with no elevations", () => {
    // What Segment.elevationsNotExists does with the normals of the normal map
    function createSegment(plainGridSize) {
        const p = plain(MESH);
        return {
            planet: {
                terrain: { plainGridSize, maxNativeZoom: 14 },
                _normalMapCreator: { queue: vi.fn() },
                _plainSegmentWorker: { make: vi.fn() },
                renderer: { requestRedraw: vi.fn() }
            },
            tileZoom: 13,
            initialized: true,
            plainReady: true,
            terrainIsLoading: true,
            node: { nodeId: 5, equalizedSideWithNodeId: [] },
            plainVertices: p.plainVertices,
            plainVerticesHigh: p.plainVerticesHigh,
            plainVerticesLow: p.plainVerticesLow,
            plainNormals: p.plainNormals,
            normalMapNormals: null,
            lodCenter: { copy: () => {} },
            _deleteSkirtBuffers: () => {},
            _plainNormalsWorkerCallback: Segment.prototype._plainNormalsWorkerCallback
        };
    }

    test("are the mesh normals when the elevation grid is not finer (EmptyTerrain)", () => {
        const seg = createSegment(2);
        Segment.prototype.elevationsNotExists.call(seg);

        expect(seg.normalMapNormals).toBe(seg.plainNormals);
        expect(seg.planet._plainSegmentWorker.make).not.toHaveBeenCalled();
        expect(seg.renderVertices).toBe(seg.plainVertices);
    });

    test("come from the plain worker in the elevation grid, as the neighbors with elevations have them", () => {
        const seg = createSegment(FILE);
        Segment.prototype.elevationsNotExists.call(seg);

        expect(seg.normalMapNormals).toBe(null);
        expect(seg.planet._plainSegmentWorker.make).toHaveBeenCalledWith(seg);
        // Drawn with the mesh meanwhile
        expect(seg.renderVertices).toBe(seg.plainVertices);
        expect(seg.terrainReady).toBe(true);

        const { id, normalMapNormals } = run(plainWorker, { params: createParams(MESH), normalsGridSize: FILE });

        expect(id).toBe(1);
        expect(normalMapNormals.length).toBe((FILE + 1) * (FILE + 1) * 3);

        let worst = 0;
        for (let i = 0; i <= FILE; i += 3) {
            for (let j = 0; j <= FILE; j += 3) {
                const k = (i * (FILE + 1) + j) * 3,
                    n = wgs84.getSurfaceNormal3v(getPoint(FILE, i, j));
                worst = Math.max(
                    worst,
                    Math.hypot(normalMapNormals[k] - n.x, normalMapNormals[k + 1] - n.y, normalMapNormals[k + 2] - n.z)
                );
            }
        }
        expect(worst).toBeLessThan(1e-6);

        seg._inTheQueue = false;
        seg._plainNormalsWorkerCallback(normalMapNormals);

        expect(seg.normalMapNormals).toBe(normalMapNormals);
        expect(seg.planet._normalMapCreator.queue).toHaveBeenLastCalledWith(seg);
    });

    test("are not taken by a segment that has got them, or was cleared", () => {
        const seg = createSegment(FILE);
        Segment.prototype.elevationsNotExists.call(seg);

        const first = new Float32Array(3),
            second = new Float32Array(3);

        seg.initialized = false;
        seg._plainNormalsWorkerCallback(first);
        expect(seg.normalMapNormals).toBe(null);

        seg.initialized = true;
        seg._plainNormalsWorkerCallback(first);
        seg._plainNormalsWorkerCallback(second);
        expect(seg.normalMapNormals).toBe(first);
    });
});

//
// A globe with the geoid. Without elevations (EmptyTerrain) the segments are drawn with the plain mesh, the terrain
// worker is not asked. With elevations the terrain worker raises the geoid surface by them.
//
describe("geoid surface", () => {
    // A grid as egm84-30: heights from -108 to 88 m
    const GEOID = { scale: 0.003, offset: -108, width: 720, height: 361, rlonres: 2, rlatres: 2, i: 0 },
        createRawfile = () => new Uint8Array(GEOID.width * GEOID.height * 2).map((_, k) => (k * 31) & 255);

    const ellipsoidMesh = plain(MESH).plainVertices;

    let geoidMesh;

    // In the library every worker has its own model, here the two worker modules share one, and it stays
    beforeAll(() => {
        plainWorker({ data: { geoidId: 1, model: { ...GEOID }, rawfile: createRawfile() } });
        terrainWorker({ data: { geoidId: 1, model: { ...GEOID }, rawfile: createRawfile() } });
        geoidMesh = plain(MESH).plainVertices;
    });

    test("the plain mesh is the geoid, not the ellipsoid", () => {
        const d = worstDistance(geoidMesh, ellipsoidMesh);
        expect(d).toBeGreaterThan(1);
        expect(d).toBeLessThan(110);
    });

    test("zero elevations give the geoid mesh from the terrain worker", () => {
        const t = terrain(new Float32Array((FILE + 1) * (FILE + 1)));
        expect(worstDistance(t.terrainVertices, geoidMesh)).toBeLessThan(1e-6);
    });

    test("elevations are counted from the geoid", () => {
        const t = terrain(new Float32Array((FILE + 1) * (FILE + 1)).fill(1000));
        for (let k = 0; k < geoidMesh.length; k += 3) {
            const d = Math.hypot(
                t.terrainVertices[k] - geoidMesh[k],
                t.terrainVertices[k + 1] - geoidMesh[k + 1],
                t.terrainVertices[k + 2] - geoidMesh[k + 2]
            );
            expect(Math.abs(d - 1000)).toBeLessThan(1e-3);
        }
    });
});
