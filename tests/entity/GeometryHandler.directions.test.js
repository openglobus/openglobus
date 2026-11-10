import { describe, expect, test } from "vitest";
import { Entity } from "../../src/entity/Entity";
import { GeometryTypeEnum } from "../../src/entity/geometry/Geometry";
import {
    DENSIFY_STEP,
    GeometryHandler,
    densifyPath,
    removeRepeatedPoints
} from "../../src/entity/geometry/GeometryHandler";
import { triangulateOnGrid } from "../../src/entity/geometry/triangulateOnGrid";
import { POLE } from "../../src/mercator";
import earcut from "earcut";
import { cube, cubeEquiangular } from "../../src/proj/cube";
import { EPSG3857 } from "../../src/proj/EPSG3857";

const RAD = Math.PI / 180;

const direction = ([lon, lat]) => [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.cos(lat * RAD) * Math.sin(lon * RAD),
    Math.sin(lat * RAD)
];

const ring = (x, y, n) => {
    const r = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        r.push([x + Math.cos(a), y + Math.sin(a)]);
    }
    return r;
};

const line = (x, y, n) => Array.from({ length: n }, (_, i) => [x + i * 0.5, y + i * 0.25]);

// All the kinds of geometries, of different sizes, so every removal shifts by a different amount
const makeEntities = (count) => {
    const entities = [];
    for (let i = 0; i < count; i++) {
        const kind = i % 4,
            x = -170 + i * 8,
            geometry =
                kind === 0
                    ? { type: "POLYGON", coordinates: [ring(x, 10, 3 + (i % 7)), ring(x, 10, 3)] }
                    : kind === 1
                      ? { type: "MULTIPOLYGON", coordinates: [[ring(x, -20, 4 + (i % 5))], [ring(x, 30, 3)]] }
                      : kind === 2
                        ? { type: "LINESTRING", coordinates: line(x, 40, 2 + (i % 6)) }
                        : { type: "MULTILINESTRING", coordinates: [line(x, -40, 3), line(x, -50, 1 + (i % 4))] };
        entities.push(new Entity({ geometry }));
    }
    return entities;
};

const setup = (count = 40) => {
    const handler = new GeometryHandler({});
    handler._isCube = true;
    const entities = makeEntities(count);
    for (const e of entities) handler.add(e.geometry);
    return { handler, entities };
};

const at = (high, low, k) => [
    high[3 * k] + low[3 * k],
    high[3 * k + 1] + low[3 * k + 1],
    high[3 * k + 2] + low[3 * k + 2]
];

const expectDirection = (d, expected) => {
    expect(Math.abs(d[0] - expected[0])).toBeLessThan(1e-12);
    expect(Math.abs(d[1] - expected[1])).toBeLessThan(1e-12);
    expect(Math.abs(d[2] - expected[2])).toBeLessThan(1e-12);
};

// The rings of polygons and the paths of lines as the handler takes them, with the long segments split
const shape = (geometry) => {
    const c = geometry._coordinates,
        rings = (r) => r.map((ring) => densifyPath(ring, true)),
        lines = (l) => l.map((path) => densifyPath(path, false));
    switch (geometry.type) {
        case GeometryTypeEnum.POLYGON:
            return { rings: rings(c), paths: rings(c), closed: true };
        case GeometryTypeEnum.MULTIPOLYGON:
            return { rings: rings(c.flat()), paths: rings(c.flat()), closed: true };
        case GeometryTypeEnum.LINESTRING:
            return { rings: [], paths: lines([c]), closed: false };
        default:
            return { rings: [], paths: lines(c), closed: false };
    }
};

// The geodetic point of the polygon vertex from its Mercator coordinates
const mercatorPoint = (handler, k) => {
    const x = handler._polyVerticesHighMerc[2 * k] + handler._polyVerticesLowMerc[2 * k],
        y = handler._polyVerticesHighMerc[2 * k + 1] + handler._polyVerticesLowMerc[2 * k + 1];
    return [(x / POLE) * 180, (Math.atan(Math.sinh((y / POLE) * Math.PI)) * 180) / Math.PI];
};

// Every vertex of every geometry has the direction of its point, at the offset of the Mercator vertex
function expectDirections({ handler, entities }, kept = entities.map((_, i) => i)) {
    expect(handler._polyDirectionsHigh.length).toBe(handler._polyVerticesHighMerc.length * 1.5);
    expect(handler._polyDirectionsLow.length).toBe(handler._polyVerticesHighMerc.length * 1.5);
    expect(handler._lineDirectionsHigh.length).toBe(handler._lineVerticesHighMerc.length * 1.5);
    expect(handler._lineDirectionsLow.length).toBe(handler._lineVerticesHighMerc.length * 1.5);

    for (const i of kept) {
        const g = entities[i].geometry,
            { rings, paths, closed } = shape(g);

        if (g._polyVerticesLength > 0) {
            const from = g._polyVerticesHandlerIndex / 2,
                to = from + g._polyVerticesLength / 2;

            // The ring points go first, the points the fill adds inside follow the rings of their polygon
            if (g.type === GeometryTypeEnum.POLYGON) {
                let k = from;
                for (const p of rings.flat()) {
                    expectDirection(at(handler._polyDirectionsHigh, handler._polyDirectionsLow, k++), direction(p));
                }
            }

            for (let k = from; k < to; k++) {
                const d = at(handler._polyDirectionsHigh, handler._polyDirectionsLow, k),
                    e = direction(mercatorPoint(handler, k));
                for (let c = 0; c < 3; c++) expect(Math.abs(d[c] - e[c])).toBeLessThan(1e-9);
            }
        }

        let k = g._lineVerticesHandlerIndex / 2;
        for (const path of paths) {
            if (!path.length) continue;
            // The point before the first one goes first
            k += 4;
            for (const p of path) {
                for (let copy = 0; copy < 4; copy++) {
                    expectDirection(at(handler._lineDirectionsHigh, handler._lineDirectionsLow, k++), direction(p));
                }
            }
            // and the point after the last one goes last
            if (closed) {
                expectDirection(at(handler._lineDirectionsHigh, handler._lineDirectionsLow, k), direction(path[0]));
            }
            k += 4;
        }
        expect(k).toBe((g._lineVerticesHandlerIndex + g._lineVerticesLength) / 2);
    }
}

describe("GeometryHandler directions", () => {
    test("are made for the cube strategies only", () => {
        const handlerOf = (projection) => {
            const handler = new GeometryHandler({ _planet: { quadTreeStrategy: { projection } } });
            handler.assignHandler({ isInitialized: () => false });
            return handler._isCube;
        };

        expect(handlerOf(cube)).toBe(true);
        expect(handlerOf(cubeEquiangular)).toBe(true);
        expect(handlerOf(EPSG3857)).toBe(false);
    });

    test("are not made without the flag", () => {
        const handler = new GeometryHandler({});
        for (const e of makeEntities(8)) handler.add(e.geometry);

        expect(handler._polyVerticesHighMerc.length).toBeGreaterThan(0);
        expect(handler._polyDirectionsHigh.length).toBe(0);
        expect(handler._lineDirectionsHigh.length).toBe(0);
    });

    test("go with the vertices of all kinds of geometries", () => {
        expectDirections(setup());
    });

    test("the point before an open line and after it go on along the line", () => {
        const ctx = setup(4),
            { handler } = ctx,
            g = ctx.entities[2].geometry,
            path = g._coordinates,
            k = g._lineVerticesHandlerIndex / 2,
            n = path.length,
            ahead = (a, b) => a.map((v, i) => 2 * v - b[i]);

        expectDirection(
            at(handler._lineDirectionsHigh, handler._lineDirectionsLow, k),
            ahead(direction(path[0]), direction(path[1]))
        );
        expectDirection(
            at(handler._lineDirectionsHigh, handler._lineDirectionsLow, k + 4 * (n + 1)),
            ahead(direction(path[n - 1]), direction(path[n - 2]))
        );
    });

    test("follow remove and removeGeometries", () => {
        const removed = [0, 3, 4, 9, 17, 18, 25, 39];
        const kept = [...Array(40).keys()].filter((i) => !removed.includes(i));

        const one = setup();
        for (let i = removed.length - 1; i >= 0; i--) one.handler.remove(one.entities[removed[i]].geometry);
        expectDirections(one, kept);

        const batch = setup();
        batch.handler.removeGeometries(removed.map((i) => batch.entities[i].geometry));
        expectDirections(batch, kept);

        expect(batch.handler._polyDirectionsHigh).toEqual(one.handler._polyDirectionsHigh);
        expect(batch.handler._lineDirectionsLow).toEqual(one.handler._lineDirectionsLow);
    });

    test("are zero for a hidden geometry and come back when it is shown", () => {
        const ctx = setup(8),
            { handler } = ctx,
            g = ctx.entities[1].geometry,
            polyFrom = g._polyVerticesHandlerIndex * 1.5,
            polyTo = polyFrom + g._polyVerticesLength * 1.5,
            lineFrom = g._lineVerticesHandlerIndex * 1.5,
            lineTo = lineFrom + g._lineVerticesLength * 1.5;

        g.setVisibility(false);

        expect(handler._polyDirectionsHigh.slice(polyFrom, polyTo).every((v) => v === 0)).toBe(true);
        expect(handler._lineDirectionsLow.slice(lineFrom, lineTo).every((v) => v === 0)).toBe(true);
        expect(handler._polyDirectionsHigh.slice(0, polyFrom).some((v) => v !== 0)).toBe(true);

        g.setVisibility(true);

        expectDirections(ctx);
    });
});

test("a long segment is split on the cube only", () => {
    const vertices = (isCube) => {
        const handler = new GeometryHandler({});
        handler._isCube = isCube;
        handler.add(
            new Entity({
                geometry: {
                    type: "LINESTRING",
                    coordinates: [
                        [35, 25],
                        [35, 45]
                    ]
                }
            }).geometry
        );
        // Four vertices of two values for each point and the two points before and after the line
        return handler._lineVerticesHighMerc.length / 8 - 2;
    };

    expect(vertices(false)).toBe(2);
    expect(vertices(true)).toBe(21);
});

describe("triangulateOnGrid", () => {
    const rect = (w, s, e, n) => [
        [w, s],
        [e, s],
        [e, n],
        [w, n]
    ];

    // The band of the issue: lon -100 to 100 at lat 40 to 44, it filled half of the polar cap on the cube
    const BAND = [densifyPath(rect(-100, 40, 100, 44), true)];

    const POLYGONS = {
        band: BAND,
        "band off the grid": [densifyPath(rect(-100.3, 40.2, 100.1, 44.5), true)],
        "with a hole": [densifyPath(rect(40, -5, 50, 5), true), densifyPath(rect(43, -2, 47, 2).reverse(), true)],
        "near the pole": [densifyPath(rect(-30, 78, 30, 86), true)],
        "over the antimeridian": [densifyPath(rect(170, 10, 190, 20), true)],
        concave: [
            densifyPath(
                Array.from({ length: 240 }, (_, i) => {
                    const a = (i / 240) * 2 * Math.PI,
                        r = 20 + 6 * Math.sin(7 * a);
                    return [10 + r * Math.cos(a), -5 + r * Math.sin(a) * 0.8];
                }),
                true
            )
        ],
        clockwise: [densifyPath(rect(0, 0, 12.5, 7.5).reverse(), true)]
    };

    const signedArea = (ring) => {
        let s = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
        }
        return s * 0.5;
    };

    const triangleArea = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) * 0.5;

    const edgeLength = (a, b) => Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));

    const longestEdge = (a, b, c) => Math.max(edgeLength(a, b), edgeLength(b, c), edgeLength(c, a));

    // The point is on a segment of a ring
    const onRing = (rings, p) =>
        rings.some((ring) =>
            ring.some((a, i) => {
                const b = ring[(i + 1) % ring.length],
                    cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]),
                    dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]),
                    len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
                return Math.abs(cross) < 1e-9 && dot >= -1e-12 && dot <= len2 + 1e-12;
            })
        );

    test("earcut alone leaves edges of tens of degrees inside the band", () => {
        const points = BAND.flat(),
            indexes = earcut(points.flat(), null, 2);
        let longest = 0;
        for (let i = 0; i < indexes.length; i += 3) {
            longest = Math.max(longest, longestEdge(...[0, 1, 2].map((e) => points[indexes[i + e]])));
        }
        expect(longest).toBeGreaterThan(50);
    });

    for (const [name, rings] of Object.entries(POLYGONS)) {
        test(`${name}: no edge is longer than the step, the area is kept, the triangles turn one way`, () => {
            const { points, indexes } = triangulateOnGrid(rings, DENSIFY_STEP),
                area = Math.abs(rings.reduce((s, ring) => s + signedArea(ring), 0)),
                sign = Math.sign(triangleArea(...[0, 1, 2].map((e) => points[indexes[e]])));

            // The ring points go first, as they are
            let k = 0;
            for (const p of rings.flat()) expect(points[k++]).toBe(p);

            let sum = 0;
            for (let i = 0; i < indexes.length; i += 3) {
                const [a, b, c] = [0, 1, 2].map((e) => points[indexes[i + e]]),
                    s = triangleArea(a, b, c);
                expect(s * sign).toBeGreaterThanOrEqual(-1e-12);
                expect(longestEdge(a, b, c)).toBeLessThanOrEqual(DENSIFY_STEP * (1 + 1e-9));
                sum += s;
            }
            expect(Math.abs(Math.abs(sum) - area)).toBeLessThan(1e-9 * area);
        });

        test(`${name}: the triangles are joined, an edge of one triangle is on a ring`, () => {
            const { points, indexes } = triangulateOnGrid(rings, DENSIFY_STEP),
                edges = new Map();

            for (let i = 0; i < indexes.length; i += 3) {
                for (let e = 0; e < 3; e++) {
                    const a = indexes[i + e],
                        b = indexes[i + ((e + 1) % 3)],
                        key = Math.min(a, b) + "," + Math.max(a, b);
                    edges.set(key, (edges.get(key) || 0) + 1);
                }
            }

            for (const [key, count] of edges) {
                expect(count).toBeLessThanOrEqual(2);
                if (count === 1) {
                    const [a, b] = key.split(",").map(Number);
                    expect(onRing(rings, points[a]) && onRing(rings, points[b])).toBe(true);
                }
            }
        });
    }

    test("the band takes two triangles for a grid cell", () => {
        const { points, indexes } = triangulateOnGrid(BAND, DENSIFY_STEP);
        expect(indexes.length / 3).toBe(200 * 4 * 2);
        expect(points.length).toBe(BAND[0].length + 199 * 3);
    });

    test("a ring with its first point again at the end", () => {
        const ring = densifyPath(rect(0, 0, 12.5, 7.5), true);
        ring.push(ring[0]);
        const { points, indexes } = triangulateOnGrid([ring], DENSIFY_STEP);

        let area = 0;
        for (let i = 0; i < indexes.length; i += 3) {
            const [a, b, c] = [0, 1, 2].map((e) => points[indexes[i + e]]);
            expect(longestEdge(a, b, c)).toBeLessThanOrEqual(DENSIFY_STEP * (1 + 1e-9));
            area += triangleArea(a, b, c);
        }
        expect(Math.abs(area)).toBeCloseTo(12.5 * 7.5, 9);
    });

    test("a closed ring, as GeoJSON has it, takes the same Delaunay triangles as the open one", () => {
        // Delaunator keeps one of the equal points, here it is the last one
        const ring = [
                [24, 5],
                [25.8, 12.3],
                [17, 14.7],
                [10, 12.8],
                [3, 14.7],
                [-5.8, 12.3],
                [-4, 5],
                [1.5, 1.1],
                [3, -4.7],
                [10, -9.6],
                [17, -4.7],
                [18.5, 1.1]
            ],
            open = triangulateOnGrid([densifyPath(ring, true)], DENSIFY_STEP),
            closed = triangulateOnGrid([densifyPath([...ring, ring[0]], true)], DENSIFY_STEP);

        expect(closed.indexes.length).toBe(open.indexes.length);
    });

    test("a ring crossing itself goes to earcut cut by the grid", () => {
        const ring = densifyPath(
                [
                    [0, 0],
                    [10, 5],
                    [10, 0],
                    [0, 5]
                ],
                true
            ),
            { points, indexes } = triangulateOnGrid([ring], DENSIFY_STEP);

        expect(indexes.length).toBeGreaterThan(0);
        for (let i = 0; i < indexes.length; i += 3) {
            const [a, b, c] = [0, 1, 2].map((e) => points[indexes[i + e]]);
            expect(longestEdge(a, b, c)).toBeLessThanOrEqual(DENSIFY_STEP * (1 + 1e-9));
        }
    });

    test("keeps a small polygon as earcut makes it", () => {
        const ring = [
                [10.1, 10.1],
                [10.6, 10.1],
                [10.6, 10.7]
            ],
            { points, indexes } = triangulateOnGrid([ring], DENSIFY_STEP);
        expect(points).toEqual(ring);
        expect(indexes.length).toBe(3);
    });

    test("the handler fills the band on the cube with the grid triangles, on the Earth with earcut", () => {
        const make = (isCube) => {
            const handler = new GeometryHandler({});
            handler._isCube = isCube;
            handler.add(new Entity({ geometry: { type: "POLYGON", coordinates: [rect(-100, 40, 100, 44)] } }).geometry);
            return handler;
        };

        const earth = make(false),
            onCube = make(true),
            vertices = onCube._polyVerticesHighMerc.length / 2,
            idx = onCube._polyIndexes;

        expect(earth._polyIndexes.length).toBe(6);
        expect(idx.length / 3).toBeGreaterThan(800);
        expect(onCube._polyDirectionsHigh.length).toBe(vertices * 3);
        expect(idx.every((i) => i < vertices)).toBe(true);

        for (let i = 0; i < idx.length; i += 3) {
            const [a, b, c] = [0, 1, 2].map((e) => mercatorPoint(onCube, idx[i + e]));
            expect(longestEdge(a, b, c)).toBeLessThan(DENSIFY_STEP + 1e-6);
        }
    });

    test("a multipolygon fills every polygon with the grid triangles", () => {
        const handler = new GeometryHandler({});
        handler._isCube = true;
        handler.add(
            new Entity({
                geometry: { type: "MULTIPOLYGON", coordinates: [[rect(-100, 40, 100, 44)], [rect(0, 0, 10, 10)]] }
            }).geometry
        );

        const idx = handler._polyIndexes;
        let area = 0;
        for (let i = 0; i < idx.length; i += 3) {
            const [a, b, c] = [0, 1, 2].map((e) => mercatorPoint(handler, idx[i + e]));
            expect(longestEdge(a, b, c)).toBeLessThan(DENSIFY_STEP + 1e-6);
            area += triangleArea(a, b, c);
        }
        expect(Math.abs(area)).toBeCloseTo(200 * 4 + 10 * 10, 4);
    });
});

describe("removeRepeatedPoints", () => {
    test("drops a point equal to the one before it", () => {
        expect(
            removeRepeatedPoints(
                [
                    [0, 0],
                    [0, 0],
                    [1, 0],
                    [1, 0],
                    [1, 0],
                    [0, 0]
                ],
                false
            )
        ).toEqual([
            [0, 0],
            [1, 0],
            [0, 0]
        ]);
    });

    test("drops the last points of a closed path equal to the first one", () => {
        const ring = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
            [0, 0]
        ];
        expect(removeRepeatedPoints(ring, true)).toEqual(ring.slice(0, 3));
        expect(removeRepeatedPoints(ring, false)).toEqual(ring.slice(0, 4));
    });

    test("drops a point on the same place with another height", () => {
        expect(
            removeRepeatedPoints(
                [
                    [0, 0, 10],
                    [0, 0, 20]
                ],
                false
            )
        ).toEqual([[0, 0, 10]]);
    });

    test("leaves one point of a path of equal points", () => {
        expect(
            removeRepeatedPoints(
                [
                    [5, 5],
                    [5, 5]
                ],
                true
            )
        ).toEqual([[5, 5]]);
    });

    // A line vertex goes four times, with a point before the path and after it
    const linePoints = (handler) => handler._lineVerticesHighMerc.length / 8 - 2;

    for (const isCube of [false, true]) {
        test(`the handler builds the lines without repeated points ${isCube ? "on the cube" : "on the Earth"}`, () => {
            const make = (geometry) => {
                const handler = new GeometryHandler({});
                handler._isCube = isCube;
                handler.add(new Entity({ geometry }).geometry);
                return handler;
            };

            const ring = [
                    [0, 0],
                    [0.5, 0],
                    [0.5, 0.5],
                    [0, 0.5]
                ],
                open = make({ type: "POLYGON", coordinates: [ring] }),
                closed = make({ type: "POLYGON", coordinates: [[...ring, ring[0]]] });

            expect(linePoints(closed)).toBe(linePoints(open));
            expect(closed._polyVerticesHighMerc.length).toBe(open._polyVerticesHighMerc.length);
            expect(closed._polyIndexes).toEqual(open._polyIndexes);

            const line = [
                    [0, 0],
                    [0, 0],
                    [0.5, 0.5],
                    [0.5, 0.5]
                ],
                once = make({ type: "LINESTRING", coordinates: [line[0], line[2]] });

            expect(linePoints(make({ type: "LINESTRING", coordinates: line }))).toBe(linePoints(once));
            expect(linePoints(make({ type: "MULTILINESTRING", coordinates: [line] }))).toBe(linePoints(once));
            expect(linePoints(make({ type: "MULTIPOLYGON", coordinates: [[[...ring, ring[0]]]] }))).toBe(
                linePoints(open)
            );
        });

        test(`the coordinates of the geometry keep their repeated points ${isCube ? "on the cube" : "on the Earth"}`, () => {
            const ring = [
                    [0, 0],
                    [0, 0],
                    [3, 0],
                    [3, 3],
                    [0, 0]
                ],
                line = [
                    [0, 0],
                    [0, 0],
                    [3, 3]
                ],
                geometries = [
                    { type: "POLYGON", coordinates: [ring] },
                    { type: "MULTIPOLYGON", coordinates: [[ring]] },
                    { type: "LINESTRING", coordinates: line },
                    { type: "MULTILINESTRING", coordinates: [line] }
                ];

            for (const geometry of geometries) {
                const handler = new GeometryHandler({}),
                    g = new Entity({ geometry }).geometry,
                    before = JSON.stringify(g._coordinates);
                handler._isCube = isCube;
                handler.add(g);
                expect(JSON.stringify(g._coordinates)).toBe(before);
            }
        });
    }
});

describe("densifyPath", () => {
    test("puts points on the long segments, evenly in longitude and latitude", () => {
        const path = densifyPath(
            [
                [35, 25],
                [35, 45],
                [35.5, 45.5]
            ],
            false
        );

        expect(path.length).toBe(22);
        expect(path[0]).toEqual([35, 25]);
        expect(path[20]).toEqual([35, 45]);
        expect(path[21]).toEqual([35.5, 45.5]);
        for (let i = 1; i < 20; i++) {
            expect(path[i][0]).toBe(35);
            expect(path[i][1]).toBeCloseTo(25 + i, 12);
        }
    });

    test("splits the edge from the last point of a ring to the first one", () => {
        const ring = densifyPath(
            [
                [0, 0],
                [3, 0],
                [3, 3]
            ],
            true
        );

        expect(ring.length).toBe(3 + 2 + 2 + 2);
        expect(ring[ring.length - 1][0]).toBeCloseTo(1, 12);
        expect(ring[ring.length - 1][1]).toBeCloseTo(1, 12);
    });

    test("keeps the short segments and interpolates the heights", () => {
        const short = [
            [10, 10],
            [10 + DENSIFY_STEP * 0.5, 10]
        ];
        expect(densifyPath(short, false)).toEqual(short);

        const high = densifyPath(
            [
                [0, 0, 100],
                [2, 0, 300]
            ],
            false
        );
        expect(high[1]).toEqual([1, 0, 200]);
    });
});
