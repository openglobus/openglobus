import { describe, test, expect, vi } from "vitest";
import { getMedian } from "../../src/terrain/terrainUtils";
import { getMatrixSubArrayBoundsExt } from "../../src/utils/shared";
import { Segment } from "../../src/segment/Segment";
import { Vec3 } from "../../src/math/Vec3";
import { MAX, MIN } from "../../src/math";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";

const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
await import("../../src/utils/TerrainWorker.worker.js");

// Small spherical planet, a 3x3 patch around (R, 0, 0) with ~10 m steps
const R = 1000000.0;
const STEP = 1e-5;

function createPatch() {
    let vertices = new Float64Array(27),
        normals = new Float32Array(27);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let lat = (1 - i) * STEP,
                lon = (j - 1) * STEP;
            let nx = Math.cos(lat) * Math.cos(lon),
                ny = Math.cos(lat) * Math.sin(lon),
                nz = Math.sin(lat);
            let k = (i * 3 + j) * 3;
            vertices[k] = R * nx - R;
            vertices[k + 1] = R * ny;
            vertices[k + 2] = R * nz;
            normals[k] = nx;
            normals[k + 1] = ny;
            normals[k + 2] = nz;
        }
    }
    return { vertices, normals };
}

function runWorker(elevations) {
    const patch = createPatch();
    post.mockClear();
    self.onmessage({
        data: {
            elevations: new Float32Array(elevations),
            this_plainVertices: patch.vertices,
            this_plainNormals: patch.normals,
            this_normalMapVertices: patch.vertices,
            this_normalMapNormals: patch.normals,
            heightFactor: 1,
            gridSize: 2,
            noDataValues: [],
            id: 3,
            relativeCenter: [R, 0, 0]
        }
    });
    return post.mock.calls[0][0];
}

function expectBoundsContain(bounds, vertices, center) {
    expect(bounds.every(Number.isFinite)).toBe(true);
    for (let k = 0; k < vertices.length; k += 3) {
        let x = vertices[k] + center[0],
            y = vertices[k + 1] + center[1],
            z = vertices[k + 2] + center[2];
        expect(x).toBeGreaterThanOrEqual(bounds[0]);
        expect(y).toBeGreaterThanOrEqual(bounds[1]);
        expect(z).toBeGreaterThanOrEqual(bounds[2]);
        expect(x).toBeLessThanOrEqual(bounds[3]);
        expect(y).toBeLessThanOrEqual(bounds[4]);
        expect(z).toBeLessThanOrEqual(bounds[5]);
    }
}

describe("getMedian", () => {
    test("returns the lower median", () => {
        expect(getMedian([5, 1, 4, 2, 3])).toBe(3);
        expect(getMedian([4, 1, 3, 2])).toBe(2);
        expect(getMedian([7])).toBe(7);
        expect(getMedian([2, 2, 2, 1, 2, 3])).toBe(2);
        expect(getMedian([])).toBeNaN();
    });

    test("uses the first n values only", () => {
        expect(getMedian(new Float64Array([3, 1, 2, 100, 100]), 3)).toBe(2);
    });

    test("agrees with sorting", () => {
        let seed = 1;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 200 - 100;
        for (let n = 1; n < 60; n++) {
            const values = Array.from({ length: n }, () => Math.round(rand()));
            const sorted = [...values].sort((a, b) => a - b);
            expect(getMedian(values)).toBe(sorted[(n - 1) >> 1]);
        }
    });
});

describe("TerrainWorker bounds", () => {
    test("deep relief stays in the bounds", () => {
        const data = runWorker(new Array(9).fill(-8000));

        expectBoundsContain(data.bounds, data.terrainVertices, data.relativeCenter);
        expect(data.radiusRange[0]).toBeCloseTo(R - 8000, 1);
        expect(data.lodRadius).toBeCloseTo(R - 8000, 1);
    });

    test("steep vertices stay in the bounds", () => {
        const data = runWorker([0, -20000, 0, -20000, 0, -20000, 0, -20000, 0]);

        expectBoundsContain(data.bounds, data.terrainVertices, data.relativeCenter);
        expect(data.radiusRange[0]).toBeCloseTo(R - 20000, 1);
        expect(data.radiusRange[1]).toBeCloseTo(R, 1);
    });

    test("a spike does not move the LOD radius", () => {
        const data = runWorker([100, 100, 100, 100, -32768, 100, 100, 100, 100]);

        expect(data.lodRadius).toBeCloseTo(R + 100, 1);
        expectBoundsContain(data.bounds, data.terrainVertices, data.relativeCenter);
    });
});

describe("child bounds cut from the parent", () => {
    test("a spike stays in the bounds, not in the LOD radius", () => {
        const { vertices, normals } = createPatch();
        for (let c = 0; c < 3; c++) {
            vertices[12 + c] -= 32768 * normals[12 + c];
        }
        const bounds = {
            xmin: MAX,
            ymin: MAX,
            zmin: MAX,
            xmax: MIN,
            ymax: MIN,
            zmax: MIN,
            r2min: Infinity,
            r2max: -Infinity
        };
        const out = new Float64Array(12),
            outR2 = new Float64Array(4);

        getMatrixSubArrayBoundsExt(
            vertices,
            2,
            1,
            1,
            1,
            new Vec3(R, 0, 0),
            new Vec3(R, 0, 0),
            out,
            new Float32Array(12),
            new Float32Array(12),
            bounds,
            outR2
        );

        expect(Math.sqrt(bounds.r2min)).toBeCloseTo(R - 32768, 1);
        expectBoundsContain([bounds.xmin, bounds.ymin, bounds.zmin, bounds.xmax, bounds.ymax, bounds.zmax], out, [
            R,
            0,
            0
        ]);
        expect(Math.sqrt(getMedian(outR2))).toBeCloseTo(R, 1);
    });
});

describe("Segment volumes", () => {
    test("inverted terrain bounds fall back to the plain segment bounds", () => {
        const seg = { setBoundingVolumeArr: vi.fn(), createBoundsByExtent: vi.fn() };

        Segment.prototype.setTerrainBoundingVolume.call(seg, [MAX, MAX, MAX, MIN, MIN, MIN]);
        Segment.prototype.setTerrainBoundingVolume.call(seg, [NaN, 0, 0, 1, 1, 1]);
        expect(seg.createBoundsByExtent).toHaveBeenCalledTimes(2);
        expect(seg.setBoundingVolumeArr).not.toHaveBeenCalled();

        Segment.prototype.setTerrainBoundingVolume.call(seg, [0, 0, 0, 1, 1, 1]);
        expect(seg.setBoundingVolumeArr).toHaveBeenCalledWith([0, 0, 0, 1, 1, 1]);
    });

    test("LOD center is the plain center raised along the radius", () => {
        const seg = { _plainCenter: new Vec3(0, 3000, 4000), _plainSurfaceRadius: 5200, lodCenter: new Vec3() };

        // The median vertex is 500 m under the surface
        Segment.prototype.setLodRadius.call(seg, 4700);

        expect(seg.lodCenter.x).toBeCloseTo(0, 9);
        expect(seg.lodCenter.y).toBeCloseTo(2700, 9);
        expect(seg.lodCenter.z).toBeCloseTo(3600, 9);
    });
});

describe("plain segment bounds", () => {
    // The box the plain segment worker made of its whole grid
    function gridBox(ext, n) {
        let min = [Infinity, Infinity, Infinity],
            max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i <= n; i++) {
            for (let j = 0; j <= n; j++) {
                let lon = ext.southWest.lon + ((ext.northEast.lon - ext.southWest.lon) * j) / n,
                    lat = ext.southWest.lat + ((ext.northEast.lat - ext.southWest.lat) * i) / n;
                let p = wgs84.geodeticToCartesian(lon, lat);
                ["x", "y", "z"].forEach((c, k) => {
                    min[k] = Math.min(min[k], p[c]);
                    max[k] = Math.max(max[k], p[c]);
                });
            }
        }
        return { min, max };
    }

    test("the corners span the box of the whole plain grid", () => {
        const extents = [
            [0, 0, 90, 66.51326], // zoom 2
            [-90, -66.51326, 0, 0],
            [90, 40.97989, 135, 66.51326], // zoom 3
            [-180, 79.17133, -168.75, 81.09321], // zoom 5
            [33.75, -11.25, 35.15625, -9.79567], // zoom 8
            [0, 85.0511, 90, 90] // north cap quadrant
        ];

        for (const [w, s, e, n] of extents) {
            const ext = new Extent(new LonLat(w, s), new LonLat(e, n));
            const seg = {
                planet: { ellipsoid: wgs84 },
                _extentLonLat: ext,
                _getExtentCorners: Segment.prototype._getExtentCorners,
                _plainCenter: new Vec3(),
                lodCenter: new Vec3()
            };

            Segment.prototype._createPlainBounds.call(seg);

            const { min, max } = gridBox(ext, 64);
            const d = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
            const label = `extent ${w}, ${s}, ${e}, ${n}`;

            expect(seg._plainCenter.x, label).toBeCloseTo(min[0] + d[0] / 2, 3);
            expect(seg._plainCenter.y, label).toBeCloseTo(min[1] + d[1] / 2, 3);
            expect(seg._plainCenter.z, label).toBeCloseTo(min[2] + d[2] / 2, 3);
            expect(seg._plainRadius, label).toBeCloseTo(0.5 * Math.hypot(...d), 3);
            expect(seg.lodCenter.equal(seg._plainCenter)).toBe(true);

            // The corners radius stands for the surface over the box center
            const surface = wgs84.projToSurface(seg._plainCenter).length();
            expect(Math.abs(seg._plainSurfaceRadius - surface), label).toBeLessThan(seg._plainRadius * 0.01);
        }
    });
});
