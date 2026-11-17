import { Extent } from "../src/Extent";
import { LonLat } from "../src/LonLat";
import { Vec3 } from "../src/math/Vec3";
import { Ray } from "../src/math/Ray";
import { Planet } from "../src/scene/Planet";
import { Segment } from "../src/segment/Segment";
import { SegmentLonLat } from "../src/segment/SegmentLonLat";
import { QuadTreeStrategy } from "../src/quadTree/QuadTreeStrategy";
import { Node } from "../src/quadTree/Node";
import * as segmentHelper from "../src/segment/segmentHelper";
import { wgs84 } from "../src/ellipsoid/wgs84";

const MAX_LOG2 = 6;

segmentHelper.getInstance().setMaxGridSize(MAX_LOG2);

// Seeded random numbers
let seed = 20261102;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const randomSides = (log2) => [0, 1, 2, 3].map(() => Math.floor(rand() * (log2 + 1)));

const mockPlanet = () => {
    const planet = new Planet();
    planet.renderer = {
        handler: {
            gl: {
                createBuffer: vi.fn(),
                createTexture: vi.fn(),
                bindBuffer: vi.fn(),
                bufferData: vi.fn(),
                deleteBuffer: vi.fn(),
                deleteTexture: vi.fn()
            }
        }
    };
    planet.terrain = { gridSizeByZoom: { 0: 8, 5: 8, 13: 8 } };
    planet.solidTextureOne = null;
    planet.solidTextureTwo = null;
    planet._createdNodesCount = 0;
    return planet;
};

// The triangles the GPU draws: the strip of the real index buffer without its degenerate steps,
// with the grid position (column, row) of the corners.
const drawnTriangles = (log2, sides) => {
    const indexes = segmentHelper.getInstance().createSegmentIndexes(log2, sides),
        d = (1 << log2) + 1,
        triangles = [];
    for (let i = 0; i + 2 < indexes.length; i++) {
        const t = [indexes[i], indexes[i + 1], indexes[i + 2]];
        if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) {
            const p = t.map((k) => [k % d, Math.floor(k / d)]);
            triangles.push({
                t,
                p,
                box: [
                    Math.min(...p.map((c) => c[0])),
                    Math.max(...p.map((c) => c[0])),
                    Math.min(...p.map((c) => c[1])),
                    Math.max(...p.map((c) => c[1]))
                ]
            });
        }
    }
    return triangles;
};

// Barycentric coordinates of the grid position (x, y) in the triangle, the smallest one is negative outside of it.
const barycentric = ([[ax, ay], [bx, by], [cx, cy]], x, y) => {
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    return [l1, l2, 1 - l1 - l2];
};

// The drawn triangles by the cells of their bounding box, to find the one at a position quickly.
const byCell = (triangles, size) => {
    const cells = Array.from({ length: size * size }, () => []);
    for (const tri of triangles) {
        for (let row = tri.box[2]; row < tri.box[3]; row++) {
            for (let col = tri.box[0]; col < tri.box[1]; col++) {
                cells[row * size + col].push(tri);
            }
        }
    }
    return { size, cells };
};

// The drawn triangle that contains the grid position, and how far inside it the position is.
const drawnAt = ({ size, cells }, x, y) => {
    let best = null,
        bestMargin = -Infinity;
    // the cells around the position, a position on a cell edge or corner touches several
    for (let row = Math.max(Math.floor(y) - 1, 0); row <= Math.min(Math.floor(y) + 1, size - 1); row++) {
        for (let col = Math.max(Math.floor(x) - 1, 0); col <= Math.min(Math.floor(x) + 1, size - 1); col++) {
            for (const tri of cells[row * size + col]) {
                const m = Math.min(...barycentric(tri.p, x, y));
                if (m > bestMargin) {
                    bestMargin = m;
                    best = tri;
                }
            }
        }
    }
    return { tri: best, margin: bestMargin };
};

// Positions on a lattice in every cell, with the cell corners and edges and the tile corners.
const latticePositions = (size, perAxis) => {
    const positions = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            for (let j = 0; j < perAxis; j++) {
                for (let i = 0; i < perAxis; i++) {
                    positions.push([col + i / (perAxis - 1), row + j / (perAxis - 1)]);
                }
            }
        }
    }
    return positions;
};

// Neighbour sizes to test for a grid: all combinations for small grids, equal and random ones above.
const sidesFor = (log2) => {
    const list = [];
    if (log2 <= 3) {
        for (let n = 0; n <= log2; n++)
            for (let e = 0; e <= log2; e++)
                for (let s = 0; s <= log2; s++) for (let w = 0; w <= log2; w++) list.push([n, e, s, w]);
    } else {
        list.push([log2, log2, log2, log2]);
        for (let k = 0; k < 40; k++) list.push(randomSides(log2));
    }
    return list;
};

const inRing = (size, x, y) =>
    Math.floor(x) <= 0 || Math.floor(y) <= 0 || Math.floor(x) >= size - 1 || Math.floor(y) >= size - 1;

describe("the triangles createSegmentIndexes draws", () => {
    // How many cells are drawn as the regular split (NW, NE, SW) + (NE, SE, SW) that getTerrainPoint assumes.
    const irregularCells = (log2, sides) => {
        const size = 1 << log2,
            d = size + 1,
            drawn = new Set(
                drawnTriangles(log2, sides).map(({ t }) =>
                    t
                        .slice()
                        .sort((a, b) => a - b)
                        .join()
                )
            );
        let ring = 0,
            inner = 0;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const nw = row * d + col,
                    regular = [
                        [nw, nw + 1, nw + d],
                        [nw + 1, nw + d + 1, nw + d]
                    ].every((t) => drawn.has(t.sort((a, b) => a - b).join()));
                if (!regular) {
                    inRing(size, col, row) ? ring++ : inner++;
                }
            }
        }
        return { ring, inner };
    };

    test("the inner cells are the regular split, the outer ring is not", () => {
        // grid 32: 124 cells in the ring
        expect(irregularCells(5, [5, 5, 5, 5])).toEqual({ ring: 62, inner: 0 }); // north and south rows
        expect(irregularCells(5, [4, 4, 4, 4])).toEqual({ ring: 124, inner: 0 }); // coarser neighbours
        expect(irregularCells(4, [4, 4, 4, 4])).toEqual({ ring: 30, inner: 0 });
        expect(irregularCells(6, [6, 6, 6, 6])).toEqual({ ring: 126, inner: 0 });
    });
});

describe("SegmentHelper.getCellTriangles", () => {
    const helper = segmentHelper.getInstance();

    const listed = ({ start, vertices }, cell) => {
        const out = [];
        for (let i = start[cell] * 3; i < start[cell + 1] * 3; i += 3) {
            out.push([vertices[i], vertices[i + 1], vertices[i + 2]]);
        }
        return out;
    };

    const key = (t) =>
        t
            .slice()
            .sort((a, b) => a - b)
            .join();

    test("lists every drawn triangle in the cells it covers, and nothing else", () => {
        for (let log2 = 0; log2 <= MAX_LOG2; log2++) {
            const size = 1 << log2;
            for (const sides of log2 === 0 ? [[0, 0, 0, 0]] : sidesFor(log2)) {
                const cells = helper.getCellTriangles(log2, sides),
                    expected = Array.from({ length: size * size }, () => new Set());
                for (const { t, box } of drawnTriangles(log2, sides)) {
                    for (let row = box[2]; row < box[3]; row++) {
                        for (let col = box[0]; col < box[1]; col++) {
                            expected[row * size + col].add(key(t));
                        }
                    }
                }
                for (let cell = 0; cell < size * size; cell++) {
                    const got = new Set(listed(cells, cell).map(key));
                    expect(got.size).toBeGreaterThan(0);
                    expect(got).toEqual(expected[cell]);
                }
            }
        }
    }, 120000);

    test("every position of a cell is inside one of the triangles listed for it", () => {
        const wrong = [];
        let checked = 0;
        for (let log2 = 0; log2 <= MAX_LOG2; log2++) {
            const size = 1 << log2,
                d = size + 1;
            for (const sides of log2 === 0 ? [[0, 0, 0, 0]] : sidesFor(log2)) {
                const cells = helper.getCellTriangles(log2, sides);
                for (const [x, y] of latticePositions(size, log2 <= 3 ? 5 : 3)) {
                    const cell = Math.min(Math.floor(y), size - 1) * size + Math.min(Math.floor(x), size - 1),
                        m = Math.max(
                            ...listed(cells, cell).map((t) =>
                                Math.min(
                                    ...barycentric(
                                        t.map((k) => [k % d, Math.floor(k / d)]),
                                        x,
                                        y
                                    )
                                )
                            )
                        );
                    if (!(m >= -1e-12)) {
                        wrong.push({ log2, sides, x, y, m });
                    }
                    checked++;
                }
            }
        }
        expect(wrong.slice(0, 3)).toEqual([]);
        expect(checked).toBeGreaterThan(100000);
    }, 120000);

    test("follows the strip it is given, whatever its layout", () => {
        // A 2 x 2 grid drawn with the other diagonal in every cell: (NW, SW, SE) + (NW, SE, NE), one strip per row
        // joined by repeated vertices.
        const strip = [3, 0, 4, 1, 5, 2, 2, 6, 6, 3, 7, 4, 8, 5],
            cells = segmentHelper.createCellTriangles(strip, 2);
        expect(listed(cells, 0).map(key)).toEqual(["0,3,4", "0,1,4"]);
        expect(listed(cells, 3).map(key)).toEqual(["4,7,8", "4,5,8"]);
    });
});

// A segment on a flat frame: the vertex in the row and column is at (100 * column, -100 * row, height),
// the ray goes straight down and the extent is one unit per cell, so the answer is exact.
const flatSegment = (log2, sides, height) => {
    const planet = mockPlanet(),
        strategy = new QuadTreeStrategy({ planet }),
        size = 1 << log2,
        extent = new Extent(new LonLat(0, 0), new LonLat(size, size)),
        node = new Node(Segment, strategy, 0, null, 13, extent),
        segment = new Segment(node, strategy, 13, extent);
    node.segment = segment;
    node.sideSizeLog2 = [...sides];
    segment.planet = { ellipsoid: { getSurfaceNormal3v: () => new Vec3(0, 0, 1) } };
    segment.gridSize = size;
    segment.renderVertices = new Float64Array((size + 1) * (size + 1) * 3);
    for (let row = 0; row <= size; row++) {
        for (let col = 0; col <= size; col++) {
            segment.renderVertices.set([100 * col, -100 * row, height(row, col)], (row * (size + 1) + col) * 3);
        }
    }
    return segment;
};

describe("Segment.getTerrainPoint", () => {
    test("is the point on the drawn triangle in every cell, above and below the terrain", () => {
        const res = new Vec3();
        let ring = 0,
            inner = 0,
            worst = 0,
            worstAt = null,
            uncovered = 0;
        for (let log2 = 0; log2 <= MAX_LOG2; log2++) {
            const size = 1 << log2;
            for (let k = 0; k < (log2 < 4 ? 30 : 6); k++) {
                const sides = log2 === 0 ? [0, 0, 0, 0] : randomSides(log2),
                    segment = flatSegment(log2, sides, () => rand() * 3000),
                    triangles = byCell(drawnTriangles(log2, sides), size),
                    positions = latticePositions(size, 4);
                for (let i = 0; i < 40; i++) {
                    positions.push([rand() * size, rand() * size]);
                }
                // A point on the edge of the tile can come out a rounding error outside of it
                positions.push([-1e-12, 0.3 * size], [size + 1e-12, 0.6 * size], [0.4 * size, -1e-12]);
                positions.push([0.7 * size, size + 1e-12], [-1e-12, -1e-12], [size + 1e-12, size + 1e-12]);
                for (const [rx, ry] of positions) {
                    const x = Math.min(Math.max(rx, 0), size),
                        y = Math.min(Math.max(ry, 0), size),
                        { tri, margin } = drawnAt(triangles, x, y),
                        [l1, l2, l3] = barycentric(tri.p, x, y),
                        h = (i) => segment.renderVertices[tri.t[i] * 3 + 2],
                        height = l1 * h(0) + l2 * h(1) + l3 * h(2),
                        z = (ring + inner) % 3 ? 5000 : -5000, // above and below the terrain
                        d = segment.getTerrainPoint(new Vec3(100 * x, -100 * y, z), new LonLat(rx, size - ry), res),
                        error = Math.max(
                            Math.abs(d - (z - height)),
                            Math.abs(res.x - 100 * x),
                            Math.abs(res.y + 100 * y),
                            Math.abs(res.z - height)
                        );
                    uncovered += margin >= -1e-9 ? 0 : 1;
                    if (Number.isNaN(error) || error > worst) {
                        worst = error;
                        worstAt = {
                            log2,
                            sides,
                            rx,
                            ry,
                            z,
                            d,
                            expected: z - height,
                            res: [res.x, res.y, res.z],
                            height
                        };
                    }
                    inRing(size, x, y) ? ring++ : inner++;
                }
            }
        }
        expect(uncovered).toBe(0);
        expect(worstAt && worst < 1e-6 ? null : worstAt).toBeNull();
        expect(ring).toBeGreaterThan(5000);
        expect(inner).toBeGreaterThan(1000);
    }, 120000);
});

// A segment on the globe with vertices on the ellipsoid, as the engine builds them.
const globeSegment = (planet, SegmentClass, extent, zoom, log2, sides, height) => {
    const strategy = new QuadTreeStrategy({ planet }),
        node = new Node(SegmentClass, strategy, 0, null, zoom, extent),
        segment = new SegmentClass(node, strategy, zoom, extent),
        size = 1 << log2,
        sw = extent.southWest,
        ne = extent.northEast,
        toLonLat = (lon, lat) => (segment.isPole ? new LonLat(lon, lat) : LonLat.inverseMercator(lon, lat));
    node.segment = segment;
    node.sideSizeLog2 = [...sides];
    segment._relativeCenter.copy(
        planet.ellipsoid.lonLatToCartesian(toLonLat((sw.lon + ne.lon) / 2, (sw.lat + ne.lat) / 2))
    );
    segment.gridSize = size;
    segment.renderVertices = new Float64Array((size + 1) * (size + 1) * 3);
    for (let row = 0; row <= size; row++) {
        for (let col = 0; col <= size; col++) {
            const lon = sw.lon + ((ne.lon - sw.lon) * col) / size,
                lat = ne.lat - ((ne.lat - sw.lat) * row) / size,
                ll = toLonLat(lon, lat);
            ll.height = height(ll.lon, ll.lat);
            const v = planet.ellipsoid.lonLatToCartesian(ll);
            segment.renderVertices.set(
                [v.x - segment._relativeCenter.x, v.y - segment._relativeCenter.y, v.z - segment._relativeCenter.z],
                (row * (size + 1) + col) * 3
            );
        }
    }
    return segment;
};

// Signed distance along the normal from xyz to the drawn surface: the line through xyz is intersected with every
// drawn triangle that has an area (the pole row of a tile that reaches a pole is one point, nothing is drawn there).
const drawnDistance = (segment, xyz) => {
    const c = segment._relativeCenter,
        v = segment.renderVertices,
        n = segment.planet.ellipsoid.getSurfaceNormal3v(xyz),
        // start far above the terrain so that the surface is always ahead of the ray
        ray = new Ray(
            new Vec3(xyz.x - c.x + 1e5 * n.x, xyz.y - c.y + 1e5 * n.y, xyz.z - c.z + 1e5 * n.z),
            n.negateTo()
        ),
        hit = new Vec3(),
        found = [];
    for (const { t } of drawnTriangles(Math.log2(segment.gridSize), segment.node.sideSizeLog2)) {
        const p = t.map((k) => new Vec3(v[k * 3], v[k * 3 + 1], v[k * 3 + 2])),
            e1 = p[1].sub(p[0]),
            e2 = p[2].sub(p[0]),
            longest = Math.max(e1.length(), e2.length(), p[2].sub(p[1]).length());
        if (
            e1.cross(e2).length() > 1e-6 * longest * longest &&
            ray.hitTriangleRes(p[0], p[1], p[2], hit) === Ray.INSIDE
        ) {
            found.push(n.dot(new Vec3(xyz.x - c.x - hit.x, xyz.y - c.y - hit.y, xyz.z - c.z - hit.z)));
        }
    }
    return found[0];
};

// Worst difference between getTerrainPoint and the drawn surface, over positions in the ring and the inner cells,
// and the number of positions where the line through the point hits no drawn triangle (it slips out at a tile edge).
const worstError = (planet, segment, log2, probes) => {
    const size = 1 << log2,
        ext = segment._extent,
        res = new Vec3();
    let worst = 0,
        misses = 0;
    for (let i = 0; i < probes; i++) {
        const ring = i % 2 === 0;
        let x = rand() * size,
            y = rand() * size;
        if (ring) {
            [() => (y = rand()), () => (x = size - rand()), () => (y = size - rand()), () => (x = rand())][
                (i % 8) >> 1
            ]();
        }
        const lon = ext.southWest.lon + ((ext.northEast.lon - ext.southWest.lon) * x) / size,
            lat = ext.northEast.lat - ((ext.northEast.lat - ext.southWest.lat) * y) / size,
            ll = segment.isPole ? new LonLat(lon, lat) : LonLat.inverseMercator(lon, lat),
            // above and below the terrain
            xyz = planet.ellipsoid.lonLatToCartesian(new LonLat(ll.lon, ll.lat, i % 3 ? 20000 : -500)),
            d = segment.getTerrainPoint(xyz, new LonLat(lon, lat), res),
            drawn = drawnDistance(segment, xyz);
        if (drawn === undefined) {
            misses++;
        } else {
            worst = Math.max(worst, Math.abs(d - drawn));
        }
    }
    return { worst, misses };
};

describe("Segment.getTerrainPoint on the globe", () => {
    const planet = mockPlanet();
    // Hills with slopes of up to 1.5 or so, a different one on every triangle of the tiles below
    const hills = (lon, lat) => {
        const x = lon * Math.cos((lat * Math.PI) / 180) * 111320,
            y = lat * 111320;
        return 900 + 120 * Math.sin(x / 110) * Math.cos(y / 120) + 20 * Math.sin(x / 31 + y / 47);
    };

    test("a tile of the Alps is within a metre of the drawn surface", () => {
        const sw = LonLat.forwardMercator(7.0, 46.0),
            w = 40075016.68 / (1 << 13),
            extent = new Extent(sw, new LonLat(sw.lon + w, sw.lat + w));
        for (const [log2, sides] of [
            [5, [5, 5, 5, 5]],
            [5, [3, 5, 4, 5]],
            [4, [2, 4, 4, 1]],
            [6, [6, 6, 3, 6]],
            [1, [1, 1, 1, 1]]
        ]) {
            const segment = globeSegment(planet, Segment, extent, 13, log2, sides, hills);
            const { worst, misses } = worstError(planet, segment, log2, 600);
            expect(worst).toBeLessThan(1);
            expect(misses).toBeLessThan(12); // rays that slip through a seam at the tile edge
        }
    }, 120000);

    test("a piece of the polar cap that does not reach the pole is within a metre of the drawn surface", () => {
        const extent = new Extent(new LonLat(10, 87), new LonLat(12, 87.1));
        for (const [log2, sides] of [
            [4, [4, 4, 4, 4]],
            [4, [3, 4, 2, 4]]
        ]) {
            const segment = globeSegment(planet, SegmentLonLat, extent, 5, log2, sides, hills);
            const { worst, misses } = worstError(planet, segment, log2, 600);
            expect(worst).toBeLessThan(1);
            expect(misses).toBeLessThan(12); // rays that slip through a seam at the tile edge
        }
    }, 120000);

    test("a tile that reaches the pole is within a metre of the drawn surface", () => {
        const extent = new Extent(new LonLat(10, 84), new LonLat(40, 90));
        for (const sides of [
            [4, 4, 4, 4],
            [3, 4, 2, 4]
        ]) {
            const segment = globeSegment(planet, SegmentLonLat, extent, 5, 4, sides, hills),
                v = segment.renderVertices,
                cells = segmentHelper.getInstance().getCellTriangles(4, sides);
            // The pole row is one point, so half of the triangles listed for its cells have no area
            let flat = 0;
            for (let i = 0; i < cells.start[16] * 3; i += 3) {
                const p = [0, 1, 2].map((j) => {
                    const k = cells.vertices[i + j] * 3;
                    return new Vec3(v[k], v[k + 1], v[k + 2]);
                });
                flat += p[1].sub(p[0]).cross(p[2].sub(p[0])).length() < 1e-3 ? 1 : 0;
            }
            expect(flat).toBeGreaterThan(5);
            const { worst, misses } = worstError(planet, segment, 4, 600);
            expect(worst).toBeLessThan(1);
            expect(misses).toBeLessThan(12); // rays that slip through a seam at the tile edge
        }
    }, 120000);
});

describe("Segment.getTerrainPoint of a segment with no vertices", () => {
    const segment = { renderVertices: null, planet: { ellipsoid: wgs84 } };

    test.each([
        ["above", 1500],
        ["below", -420],
        ["at", 0]
    ])("a point %s the ellipsoid goes down its normal to it", (_, height) => {
        const lonLat = new LonLat(37.3, 61.8, height),
            res = new Vec3();

        const d = Segment.prototype.getTerrainPoint.call(segment, wgs84.lonLatToCartesian(lonLat), lonLat, res);

        expect(d).toBeCloseTo(height, 6);
        expect(res.distance(wgs84.lonLatToCartesian(new LonLat(lonLat.lon, lonLat.lat, 0)))).toBeLessThan(1e-6);
    });

    test("an empty vertex array is the same", () => {
        const lonLat = new LonLat(-120, -30, 250),
            res = new Vec3();

        Segment.prototype.getTerrainPoint.call(
            { ...segment, renderVertices: [] },
            wgs84.lonLatToCartesian(lonLat),
            lonLat,
            res
        );

        expect(wgs84.cartesianToLonLat(res).height).toBeCloseTo(0, 6);
    });
});
