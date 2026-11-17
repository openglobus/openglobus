import { describe, test, expect, vi } from "vitest";
import * as segmentHelper from "../../src/segment/segmentHelper";
import {
    TERRAIN_GRID_SIZE_BY_ZOOM,
    createHeightsLevels,
    createHeightsLevelsSource,
    getSubdivisionLevels
} from "../../src/terrain/terrainUtils";
import { getTileExtent } from "../../src/mercator";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Handler } from "../../src/webgl/Handler";
import { NormalsArray } from "../../src/utils/normalsArray";

//
// Memory budget of the terrain, measured on the arrays the real code makes. The expectations fix the numbers
// of the current code, the proposals that are not made yet are printed next to them.
//
// Mapterhorn: 512 px tiles, elevation grid (plainGridSize) 256, mesh grids TERRAIN_GRID_SIZE_BY_ZOOM (64 at most).
//

const MB = 1024 * 1024;
const mb = (bytes) => Math.round((bytes / MB) * 100) / 100;
const kb = (bytes) => Math.round(bytes / 1024);
const bytesOf = (obj) => Object.values(obj).reduce((sum, a) => sum + (ArrayBuffer.isView(a) ? a.byteLength : 0), 0);

const MAPTERHORN = { imageSize: 512, plainGridSize: 256, maxNativeZoom: 12, maxZoom: 17 };

// The worker modules set self.onmessage, their results go to self.postMessage
const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
await import("../../src/utils/PlainSegmentWorker.worker.js");
const plainWorker = self.onmessage;
await import("../../src/utils/TerrainWorker.worker.js");
const terrainWorker = self.onmessage;

function runWorker(worker, data) {
    post.mockClear();
    worker({ data });
    return post.mock.calls[0][0];
}

// Tile over the Matterhorn
function getTile(z) {
    const merc = new LonLat(7.6586, 45.9766).forwardMercator(),
        e0 = getTileExtent(0, 0, z),
        size = e0.getWidth();
    return getTileExtent(
        Math.floor((merc.lon - e0.southWest.lon) / size),
        Math.floor((e0.northEast.lat - merc.lat) / size),
        z
    );
}

/**
 * The arrays a segment keeps after the plain segment worker, and after the terrain worker.
 */
function createSegmentArrays(z, gridSize, plainGridSize) {
    const extent = getTile(z),
        c = wgs84.lonLatToCartesian(LonLat.inverseMercator(extent.getCenter().lon, extent.getCenter().lat)),
        r2 = wgs84._invRadii2;

    // See createPlainSegmentParams
    const params = () =>
        new Float64Array([
            1,
            0,
            gridSize,
            plainGridSize,
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
            c.x,
            c.y,
            c.z
        ]);

    const { id: _id, geoidId: _gid, relativeCenter: _rc, ...plain } = runWorker(plainWorker, { params: params() });

    const fgs1 = plainGridSize + 1,
        elevations = new Float32Array(fgs1 * fgs1).map(
            (_, k) => 3000 + 800 * Math.sin((k % fgs1) / 9) * Math.cos(Math.floor(k / fgs1) / 7)
        );

    // Segment.elevationsExists: a copy for the worker, a copy for the segment
    const elevationData = new Float32Array(elevations);

    const terrain = runWorker(terrainWorker, {
        elevations,
        params: params(),
        heightFactor: 1,
        gridSize,
        noDataValues: [-10000],
        id: 1
    });

    return {
        plain,
        terrain,
        elevationData,
        plainTotal: bytesOf(plain),
        // The plain arrays are dropped when the terrain comes
        terrainTotal: bytesOf(terrain) + elevationData.byteLength
    };
}

describe("segment arrays in the main thread", () => {
    const Z = 15,
        gridSize = TERRAIN_GRID_SIZE_BY_ZOOM[Z];

    test("a segment keeps the mesh, the normals of the elevation grid and the elevations", () => {
        const rows = [32, 64, 128, 256].map((plainGridSize) => {
            const s = createSegmentArrays(Z, gridSize, plainGridSize),
                t = s.terrain;
            return {
                plainGridSize,
                meshGrid: gridSize,
                "plain stage, KB": kb(s.plainTotal),
                "terrain stage, KB": kb(s.terrainTotal),
                "mesh, KB": kb(bytesOf([t.terrainVertices, t.terrainVerticesHigh, t.terrainVerticesLow])),
                "normalMapNormals, KB": kb(t.normalMapNormals.byteLength),
                "elevationData, KB": kb(s.elevationData.byteLength)
            };
        });
        console.table(rows);

        const s = createSegmentArrays(Z, gridSize, MAPTERHORN.plainGridSize),
            t = s.terrain,
            meshVertices = 65 * 65;

        expect(gridSize).toBe(64);

        // The plain stage is the mesh only: vertices, their high and low parts, normals
        expect(Object.keys(s.plain).sort()).toEqual(
            ["plainNormals", "plainVertices", "plainVerticesHigh", "plainVerticesLow"].sort()
        );
        expect(s.plainTotal).toBe(meshVertices * 3 * (8 + 4 + 4 + NormalsArray.BYTES_PER_ELEMENT));

        // No elevation grid vertices, the normals of the normal map are in the elevation grid, 16 bit
        expect(t.normalMapVertices).toBe(null);
        expect(t.normalMapNormals.byteLength).toBe(257 * 257 * 3 * 2);
        expect(t.terrainVertices.byteLength).toBe(meshVertices * 3 * 8);
        expect(s.elevationData.byteLength).toBe(257 * 257 * 4);

        // It was 2.71 MB with terrain and 2.51 MB without, before the elevation grid arrays were dropped,
        // and 1.2 MB with terrain with 32 bit normals
        expect(mb(s.terrainTotal)).toBeLessThan(0.85);
        expect(mb(s.plainTotal)).toBeLessThan(0.25);
    });
});

describe("elevation cache of RgbTerrain", () => {
    const { imageSize, plainGridSize, maxNativeZoom, maxZoom } = MAPTERHORN;
    const decodeRow = (row, out) => {
        for (let j = 0; j < out.length; j++) {
            out[j] = 2000 + row + j;
        }
    };

    test("a loaded tile keeps the heights of all its subdivision levels in one buffer", () => {
        const rows = [];
        for (const z of [8, 11, 12, 13, 15, 16, 17]) {
            const levels =
                    z === maxZoom ? 0 : getSubdivisionLevels(imageSize, plainGridSize, z, maxZoom, maxNativeZoom),
                heights = createHeightsLevels(imageSize, plainGridSize, levels, decodeRow, -10000),
                source = createHeightsLevelsSource(imageSize, plainGridSize, levels, decodeRow, -10000);
            rows.push({
                zoom: z,
                levels,
                tiles: heights.length / (257 * 257),
                "now: all the levels, MB": mb(heights.byteLength),
                "P4: tile + pixels for the levels on demand, MB": mb(
                    257 * 257 * 4 + (levels ? source.pixels.byteLength : 0)
                )
            });
        }
        console.table(rows);

        const at = (z) => rows.find((r) => r.zoom === z);

        expect(at(8).tiles).toBe(5);
        expect(at(11).tiles).toBe(21);
        expect(at(12).tiles).toBe(21);
        expect(at(13).tiles).toBe(21);
        expect(at(12)["now: all the levels, MB"]).toBeCloseTo(5.29, 1);
        expect(at(12)["P4: tile + pixels for the levels on demand, MB"]).toBeCloseTo(1.25, 1);
    });
});

// More than the vertices of the 256 grid
const K = 1 << 17;

// Triangles of a strip range as gl.drawElements(TRIANGLE_STRIP, count, type, start) draws them, with their winding
function stripTriangles(indexes, start = 0, count = indexes.length - start, out = new Map()) {
    for (let i = 0; i + 2 < count; i++) {
        let a = indexes[start + i],
            b = indexes[start + i + 1],
            c = indexes[start + i + 2];
        if (a === b || b === c || a === c) {
            continue;
        }
        if (i & 1) {
            [a, b] = [b, a];
        }
        // Rotated to start from the smallest index, the winding stays
        const m = Math.min(a, b, c),
            key = m === a ? (a * K + b) * K + c : m === b ? (b * K + c) * K + a : (c * K + a) * K + b;
        out.set(key, (out.get(key) || 0) + 1);
    }
    return out;
}

describe("index buffers cache", () => {
    const MAX_LOG2 = 8,
        // Planet.onPreDraw clears the cache when more buffers than that are created
        MAX_CACHED = 600;

    segmentHelper.getInstance().setMaxGridSize(MAX_LOG2);
    const helper = segmentHelper.getInstance();

    const sizes = Array.from({ length: MAX_LOG2 }, (_, k) => k + 1);

    test("a cached buffer is the whole grid, 16 bit up to the grid 128, the part that depends on the neighbours is 2-6% of it", () => {
        const rows = sizes.map((s) => {
            const full = helper.createSegmentIndexes(s, [s, s, s, s]),
                center = helper.centerIndexesTable[s];
            return {
                grid: 1 << s,
                indexes: full.length,
                type: full.constructor.name,
                KB: kb(full.byteLength),
                [`x ${MAX_CACHED}, MB`]: mb(full.byteLength * MAX_CACHED),
                [`was Uint32 x ${MAX_CACHED}, MB`]: mb(full.length * 4 * MAX_CACHED),
                [`P5b: border only x ${MAX_CACHED}, MB`]: mb((full.length - center.length) * 4 * MAX_CACHED)
            };
        });
        console.table(rows);

        const at = (grid) => rows.find((r) => r.grid === grid);

        for (const row of rows) {
            expect(row.type).toBe(row.grid <= 128 ? "Uint16Array" : "Uint32Array");
        }

        // The mesh grid of Mapterhorn is 64 at most
        expect(at(64)[`was Uint32 x ${MAX_CACHED}, MB`]).toBeGreaterThan(18);
        expect(at(64)[`x ${MAX_CACHED}, MB`]).toBeLessThan(10);
        expect(at(256)[`x ${MAX_CACHED}, MB`]).toBeGreaterThan(300);
        expect(at(256)[`P5b: border only x ${MAX_CACHED}, MB`]).toBeLessThan(5);
    });

    test("the 16 bit indexes stay below 0xFFFF, the primitive restart index of WebGL2", () => {
        for (let s = 0; s <= 7; s++) {
            const indexes = helper.createSegmentIndexes(s, [s, 0, s, 0]);
            expect(indexes).toBeInstanceOf(Uint16Array);
            expect(Math.max(...indexes)).toBe(((1 << s) + 1) ** 2 - 1);
        }
        expect(segmentHelper.createIndexesArray(10, 0xffff)).toBeInstanceOf(Uint16Array);
        expect(segmentHelper.createIndexesArray(10, 0x10000)).toBeInstanceOf(Uint32Array);
    });

    test("the element array buffer has the index type of its array, others have none", () => {
        const gl = {
            ELEMENT_ARRAY_BUFFER: 34963,
            STATIC_DRAW: 35044,
            UNSIGNED_SHORT: 5123,
            UNSIGNED_INT: 5125,
            createBuffer: () => ({}),
            bindBuffer() {},
            bufferData() {}
        };
        const create = (array) => Handler.prototype.createElementArrayBuffer.call({ gl }, array, 1);

        expect(create(new Uint16Array(4)).type).toBe(gl.UNSIGNED_SHORT);
        expect(create(new Uint32Array(4)).type).toBe(gl.UNSIGNED_INT);
        expect(create(new Uint8Array(4)).type).toBeUndefined();
    });

    test("P5b: the center drawn from one shared buffer and the border from the cached one give the same triangles", () => {
        let seed = 20261113;
        const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
            randomSide = () => Math.floor(rand() * (MAX_LOG2 + 1));

        const check = (s, sides) => {
            const full = helper.createSegmentIndexes(s, sides),
                center = helper.centerIndexesTable[s],
                border = full.subarray(center.length);

            // The strip winding goes on in the border as in the whole buffer
            expect(center.length % 2).toBe(0);

            const whole = stripTriangles(full),
                parts = stripTriangles(border, 0, border.length, stripTriangles(center));

            expect(parts.size).toBe(whole.size);
            for (const [key, count] of whole) {
                if (parts.get(key) !== count) {
                    throw new Error(`grid ${1 << s}, sides ${sides}: triangle ${key} differs`);
                }
            }
        };

        // All the neighbour sizes of the small grids
        for (let s = 1; s <= 4; s++) {
            for (let k = 0; k < 5 ** 4; k++) {
                check(s, [k % 5, Math.floor(k / 5) % 5, Math.floor(k / 25) % 5, Math.floor(k / 125) % 5]);
            }
        }

        for (let k = 0; k < 150; k++) {
            check(1 + Math.floor(rand() * MAX_LOG2), [randomSide(), randomSide(), randomSide(), randomSide()]);
        }
    }, 60000);

    test("P5c: all the combinations as ranges of one buffer per grid size", () => {
        let combinations = 0,
            now = 0,
            ranges = 0;

        for (const s of sizes) {
            const center = helper.centerIndexesTable[s].length;
            ranges += center;
            for (let side = 0; side < 4; side++) {
                for (let n = 0; n <= MAX_LOG2; n++) {
                    // One more index joins a side with the next one
                    ranges += helper.skirtsIndexesTable[side][s][n].length + 1;
                }
            }
            const perSide = [0, 1, 2, 3].map((side) =>
                helper.skirtsIndexesTable[side][s].reduce((sum, a) => sum + a.length, 0)
            );
            // Sum over all the combinations: every side variant comes with (MAX_LOG2 + 1)^3 variants of the others
            const variants = MAX_LOG2 + 1;
            combinations += variants ** 4;
            now += center * variants ** 4 + perSide.reduce((a, b) => a + b, 0) * variants ** 3;
        }

        console.table([
            { cache: "now, every combination its own buffer", buffers: combinations, MB: mb(now * 4) },
            { cache: "P5c, ranges of one buffer per grid size", buffers: sizes.length, MB: mb(ranges * 4) }
        ]);

        expect(mb(ranges * 4)).toBeLessThan(1.5);
    });
});
