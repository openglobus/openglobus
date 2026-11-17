import { Extent } from "../src/Extent";
import { LonLat } from "../src/LonLat";
import { Vec3 } from "../src/math/Vec3";
import { Ray } from "../src/math/Ray";
import { Planet } from "../src/scene/Planet";
import { Segment } from "../src/segment/Segment";
import { QuadTreeStrategy } from "../src/quadTree/QuadTreeStrategy";
import { Node } from "../src/quadTree/Node";
import * as segmentHelper from "../src/segment/segmentHelper";

const MAX_LOG2 = 6;

segmentHelper.getInstance().setMaxGridSize(MAX_LOG2);

// Seeded random numbers
let seed = 20261117;
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
            },
            createArrayBuffer: (data, itemSize, numItems) => ({ numItems }),
            setStreamArrayBuffer: vi.fn()
        }
    };
    planet.terrain = { gridSizeByZoom: { 0: 8, 5: 8, 13: 8 } };
    planet.solidTextureOne = null;
    planet.solidTextureTwo = null;
    planet._createdNodesCount = 0;
    planet._textureCoordsBufferCache = [];
    return planet;
};

// The triangles the GPU draws: the strip of the real index buffer without its degenerate steps.
const drawnTriangles = (log2, sides) => {
    const indexes = segmentHelper.getInstance().createSegmentIndexes(log2, sides),
        triangles = [];
    for (let i = 0; i + 2 < indexes.length; i++) {
        const t = [indexes[i], indexes[i + 1], indexes[i + 2]];
        if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) {
            triangles.push(t);
        }
    }
    return triangles;
};

// Reference: the nearest hit of the ray (origin and direction in the frame of the render vertices) on any drawn
// triangle that has an area, from either side, plain Moller-Trumbore without a margin.
const bruteDistance = (segment, o, d) => {
    const v = segment.renderVertices,
        log2 = Math.log2(Math.round(Math.sqrt(v.length / 3)) - 1),
        p = (k) => new Vec3(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]);
    let best = Infinity;
    for (const t of drawnTriangles(log2, segment.node.sideSizeLog2)) {
        const a = p(t[0]),
            e1 = p(t[1]).sub(a),
            e2 = p(t[2]).sub(a),
            longest = Math.max(e1.length(), e2.length(), e2.sub(e1).length());
        if (!(e1.cross(e2).length() > 1e-6 * longest * longest)) {
            continue;
        }
        const pv = d.cross(e2),
            det = e1.dot(pv);
        if (Math.abs(det) < 1e-15) continue;
        const s = o.sub(a),
            u = s.dot(pv) / det;
        if (u < 0 || u > 1) continue;
        const q = s.cross(e1),
            w = d.dot(q) / det;
        if (w < 0 || u + w > 1) continue;
        const dist = e2.dot(q) / det;
        if (dist >= 0 && dist < best) best = dist;
    }
    return best;
};

// A segment on a flat frame: the vertex in the row and column is at (100 * column, -100 * row, height).
const flatSegment = (log2, sides, height) => {
    const planet = mockPlanet(),
        strategy = new QuadTreeStrategy({ planet }),
        size = 1 << log2,
        extent = new Extent(new LonLat(0, 0), new LonLat(size, size)),
        node = new Node(Segment, strategy, 0, null, 13, extent),
        segment = new Segment(node, strategy, 13, extent);
    node.segment = segment;
    node.sideSizeLog2 = [...sides];
    segment.gridSize = size;
    segment.renderVertices = new Float64Array((size + 1) * (size + 1) * 3);
    for (let row = 0; row <= size; row++) {
        for (let col = 0; col <= size; col++) {
            segment.renderVertices.set([100 * col, -100 * row, height(row, col)], (row * (size + 1) + col) * 3);
        }
    }
    return segment;
};

// A segment on the globe with vertices on the ellipsoid, as the engine builds them.
const globeSegment = (planet, extent, zoom, log2, sides, height) => {
    const strategy = new QuadTreeStrategy({ planet }),
        node = new Node(Segment, strategy, 0, null, zoom, extent),
        segment = new Segment(node, strategy, zoom, extent),
        size = 1 << log2,
        sw = extent.southWest,
        ne = extent.northEast;
    node.segment = segment;
    node.sideSizeLog2 = [...sides];
    segment._relativeCenter.copy(
        planet.ellipsoid.lonLatToCartesian(LonLat.inverseMercator((sw.lon + ne.lon) / 2, (sw.lat + ne.lat) / 2))
    );
    segment.gridSize = size;
    segment.renderVertices = new Float64Array((size + 1) * (size + 1) * 3);
    const c = segment._relativeCenter;
    let cx = 0,
        cy = 0,
        cz = 0;
    const points = [];
    for (let row = 0; row <= size; row++) {
        for (let col = 0; col <= size; col++) {
            const ll = LonLat.inverseMercator(
                sw.lon + ((ne.lon - sw.lon) * col) / size,
                ne.lat - ((ne.lat - sw.lat) * row) / size
            );
            ll.height = height(ll.lon, ll.lat);
            const v = planet.ellipsoid.lonLatToCartesian(ll);
            points.push(v);
            cx += v.x;
            cy += v.y;
            cz += v.z;
            segment.renderVertices.set([v.x - c.x, v.y - c.y, v.z - c.z], (row * (size + 1) + col) * 3);
        }
    }
    // the bounding sphere the planet ray test starts with
    segment.bsphere.center.set(cx / points.length, cy / points.length, cz / points.length);
    segment.bsphere.radius = Math.max(...points.map((p) => p.distance(segment.bsphere.center)));
    return segment;
};

const close = (a, b) => (a === Infinity ? b === Infinity : Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)));

describe("Segment.getRayDistance", () => {
    test("is the nearest drawn triangle on hilly frames of every grid size and neighbour sizes", () => {
        const wrong = [];
        let hits = 0,
            misses = 0;
        for (let log2 = 0; log2 <= MAX_LOG2; log2++) {
            const size = 1 << log2;
            for (let k = 0; k < (log2 < 4 ? 20 : 6); k++) {
                const sides = log2 === 0 ? [0, 0, 0, 0] : randomSides(log2),
                    segment = flatSegment(log2, sides, () => rand() * 3000),
                    w = 100 * size;
                for (let i = 0; i < 60; i++) {
                    let o, d;
                    if (i % 3 === 2) {
                        // nearly horizontal rays from the side, into the hills
                        o = new Vec3(-200, -rand() * w, 500 + rand() * 2000);
                        d = new Vec3(1, (rand() - 0.5) * 0.4, (rand() - 0.6) * 0.3);
                    } else {
                        // from above to a point inside the tile, the direction is not normalized
                        o = new Vec3((rand() * 2 - 0.5) * w, -(rand() * 2 - 0.5) * w, 5000 + rand() * 4000);
                        const target = new Vec3(5 + rand() * (w - 10), -5 - rand() * (w - 10), rand() * 3000);
                        d = target.sub(o).scale(0.5 + rand() * 3);
                    }
                    const got = segment.getRayDistance(o, d),
                        want = bruteDistance(segment, o, d);
                    want === Infinity ? misses++ : hits++;
                    if (!close(got, want)) {
                        wrong.push({ log2, sides, o, d, got, want });
                    }
                }
            }
        }
        expect(wrong.slice(0, 3)).toEqual([]);
        expect(hits).toBeGreaterThan(1500);
        expect(misses).toBeGreaterThan(50);
    }, 120000);

    test("finds the same surface as getTerrainPoint straight down", () => {
        const segment = flatSegment(5, [4, 5, 3, 5], (row, col) => 300 * Math.sin(row / 3) + 200 * Math.cos(col / 2)),
            norm = new Vec3(0, 0, 1),
            res = new Vec3();
        segment.planet = { ellipsoid: { getSurfaceNormal3v: () => norm } };
        for (let i = 0; i < 200; i++) {
            const gx = 0.05 + rand() * 31.9,
                gy = 0.05 + rand() * 31.9,
                o = new Vec3(100 * gx, -100 * gy, 4000);
            // getTerrainPoint takes the position in the extent: one unit per cell, rows from the south edge
            segment.getTerrainPoint(o, new LonLat(gx, 32 - gy), res);
            expect(segment.getRayDistance(o, new Vec3(0, 0, -1))).toBeCloseTo(4000 - res.z, 6);
        }
    });

    test("misses a ray that passes by and one that points away", () => {
        const segment = flatSegment(3, [3, 3, 3, 3], () => 100);
        expect(segment.getRayDistance(new Vec3(-500, 500, 1000), new Vec3(0, 0, -1))).toBe(Infinity);
        expect(segment.getRayDistance(new Vec3(400, -400, 1000), new Vec3(0, 0, 1))).toBe(Infinity);
    });

    test("finds a ray that starts under the terrain from below", () => {
        const segment = flatSegment(3, [3, 3, 3, 3], () => 100);
        expect(segment.getRayDistance(new Vec3(400, -400, -50), new Vec3(0, 0, 1))).toBeCloseTo(150, 9);
    });

    test("does not look for hits from maxDistance on", () => {
        const segment = flatSegment(3, [3, 3, 3, 3], () => 100),
            o = new Vec3(400, -400, 1000),
            d = new Vec3(0, 0, -1);
        expect(segment.getRayDistance(o, d, 901)).toBeCloseTo(900, 9);
        expect(segment.getRayDistance(o, d, 900)).toBe(Infinity);
    });

    test("is Infinity without vertices", () => {
        const segment = flatSegment(2, [2, 2, 2, 2], () => 0);
        segment.renderVertices = null;
        expect(segment.getRayDistance(new Vec3(100, -100, 10), new Vec3(0, 0, -1))).toBe(Infinity);
        segment.renderVertices = new Float64Array(0);
        expect(segment.getRayDistance(new Vec3(100, -100, 10), new Vec3(0, 0, -1))).toBe(Infinity);
    });

    test("sees vertices changed in place once their buffers are made again", () => {
        const segment = flatSegment(4, [4, 4, 4, 4], () => 0),
            o = new Vec3(150, -150, 1000),
            d = new Vec3(0, 0, -1);
        expect(segment.getRayDistance(o, d)).toBeCloseTo(1000, 9);

        // a peak far above the old bounding boxes, as equalization changes the vertices of a segment in place
        for (let k = 2; k < segment.renderVertices.length; k += 3) {
            segment.renderVertices[k] = 600;
        }
        segment.createCoordsBuffers(new Float32Array(17 * 17 * 3), new Float32Array(17 * 17 * 3), 16);
        expect(segment.getRayDistance(o, d)).toBeCloseTo(400, 9);
    });

    test("sees new vertices and new neighbour sizes", () => {
        const segment = flatSegment(4, [4, 4, 4, 4], () => 0),
            o = new Vec3(150, -150, 1000),
            d = new Vec3(0, 0, -1);
        expect(segment.getRayDistance(o, d)).toBeCloseTo(1000, 9);
        segment.renderVertices = flatSegment(4, [4, 4, 4, 4], () => 250).renderVertices;
        expect(segment.getRayDistance(o, d)).toBeCloseTo(750, 9);

        // the outer ring is drawn with other triangles for coarser neighbours
        const hilly = flatSegment(4, [4, 4, 4, 4], (row, col) => (row * 7 + col * 13) % 50),
            near = new Vec3(150, -50, 1000),
            want = bruteDistance(flatSegment(4, [1, 4, 4, 4], (row, col) => (row * 7 + col * 13) % 50), near, d);
        hilly.getRayDistance(near, d);
        hilly.node.sideSizeLog2 = [1, 4, 4, 4];
        expect(hilly.getRayDistance(near, d)).toBeCloseTo(want, 9);
    });
});

describe("Segment.getRayDistance on the globe", () => {
    const planet = mockPlanet();
    const hills = (lon, lat) => {
        const x = lon * Math.cos((lat * Math.PI) / 180) * 111320,
            y = lat * 111320;
        return 900 + 120 * Math.sin(x / 110) * Math.cos(y / 120) + 20 * Math.sin(x / 31 + y / 47);
    };

    test("a tile of the Alps seen from a camera above it", () => {
        const sw = LonLat.forwardMercator(7.0, 46.0),
            w = 40075016.68 / (1 << 13),
            extent = new Extent(sw, new LonLat(sw.lon + w, sw.lat + w));
        for (const [log2, sides] of [
            [5, [5, 5, 5, 5]],
            [5, [3, 5, 4, 5]],
            [6, [6, 6, 3, 6]]
        ]) {
            const segment = globeSegment(planet, extent, 13, log2, sides, hills),
                c = segment._relativeCenter,
                ll = planet.ellipsoid.cartesianToLonLat(c),
                eye = planet.ellipsoid.lonLatToCartesian(new LonLat(ll.lon + 0.03, ll.lat - 0.02, 3500));
            for (let i = 0; i < 80; i++) {
                const target = planet.ellipsoid.lonLatToCartesian(
                        new LonLat(
                            7.0 + 0.002 + rand() * 0.04,
                            46.0 + 0.002 + rand() * 0.025,
                            700 + rand() * 400
                        )
                    ),
                    d = target.sub(eye).normalize(),
                    got = segment.getRayDistance(eye, d),
                    want = bruteDistance(segment, eye.sub(c), d);
                expect(close(got, want)).toBe(true);
            }
        }
    }, 120000);
});

describe("Planet.getRayDistanceTerrain", () => {
    const planet = mockPlanet();
    const hills = (lon, lat) => 400 + 300 * Math.sin(lon * 900) * Math.cos(lat * 700);
    const w = 40075016.68 / (1 << 12),
        x0 = LonLat.forwardMercator(10.0, 45.0);

    // a row of three tiles, the middle one finer
    const segments = [0, 1, 2].map((k) =>
        globeSegment(
            planet,
            new Extent(new LonLat(x0.lon + k * w, x0.lat), new LonLat(x0.lon + (k + 1) * w, x0.lat + w)),
            12,
            k === 1 ? 5 : 4,
            k === 1 ? [5, 4, 5, 4] : [4, 4, 4, 4],
            hills
        )
    );

    planet.quadTreeStrategy = { _renderedNodes: segments.map((s) => s.node) };
    planet.camera = {
        getRay: (x, y) => new Ray(new Vec3(x, y, 0), new Vec3(0, 0, 1))
    };

    const brute = (o, d) => Math.min(...segments.map((s) => bruteDistance(s, o.sub(s._relativeCenter), d)));

    test("is the nearest hit over all rendered segments", () => {
        // the three tiles cover these longitudes and latitudes
        const sw = LonLat.inverseMercator(x0.lon, x0.lat),
            ne = LonLat.inverseMercator(x0.lon + 3 * w, x0.lat + w),
            lon = (f) => sw.lon + f * (ne.lon - sw.lon),
            lat = (f) => sw.lat + f * (ne.lat - sw.lat);
        let hits = 0;
        for (let i = 0; i < 150; i++) {
            const eye = planet.ellipsoid.lonLatToCartesian(
                    new LonLat(lon(rand() * 1.2 - 0.1), lat(rand() * 1.2 - 0.1), 1500 + rand() * 6000)
                ),
                // mostly inside the tiles, some past their edges
                target = planet.ellipsoid.lonLatToCartesian(
                    new LonLat(lon(rand() * 1.1 - 0.05), lat(rand() * 1.1 - 0.05), rand() * 700)
                ),
                ray = new Ray(eye, target.sub(eye).normalize()),
                got = planet.getRayDistanceTerrain(ray),
                want = brute(eye, ray.direction);
            if (want !== Infinity) hits++;
            expect(close(got, want)).toBe(true);
            if (got !== Infinity) {
                const p = planet.getRayIntersectionTerrain(ray);
                expect(p.distance(eye.add(ray.direction.scaleTo(got)))).toBeLessThan(1e-6);
            }
        }
        expect(hits).toBeGreaterThan(100);
    }, 120000);

    test("is Infinity for a ray to the sky", () => {
        const eye = planet.ellipsoid.lonLatToCartesian(new LonLat(10.1, 45.1, 3000)),
            up = eye.normal();
        expect(planet.getRayDistanceTerrain(new Ray(eye, up))).toBe(Infinity);
        expect(planet.getRayIntersectionTerrain(new Ray(eye, up))).toBeUndefined();
    });

    test("skips segments without vertices and tests segments without a bounding sphere", () => {
        const flat = flatSegment(2, [2, 2, 2, 2], () => 0),
            empty = flatSegment(2, [2, 2, 2, 2], () => 0);
        empty.renderVertices = null;
        flat.bsphere.radius = 0;
        const p = mockPlanet();
        p.quadTreeStrategy = { _renderedNodes: [empty.node, flat.node] };
        expect(p.getRayDistanceTerrain(new Ray(new Vec3(100, -100, 50), new Vec3(0, 0, -1)))).toBeCloseTo(50, 9);
    });

    test("getCartesianFromPixelTerrain casts the camera ray", () => {
        const flat = flatSegment(2, [2, 2, 2, 2], () => 0),
            p = mockPlanet();
        flat.bsphere.radius = 0;
        p.quadTreeStrategy = { _renderedNodes: [flat.node] };
        p.camera = { getRay: (x, y) => new Ray(new Vec3(x, -y, 80), new Vec3(0, 0, -1)) };
        expect(p.getCartesianFromPixelTerrain({ x: 150, y: 250 })).toEqual(new Vec3(150, -250, 0));
        expect(p.getCartesianFromPixelTerrain({ x: 900, y: 250 })).toBeUndefined();
    });
});
