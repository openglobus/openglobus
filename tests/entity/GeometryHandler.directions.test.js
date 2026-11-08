import { describe, expect, test } from "vitest";
import { Entity } from "../../src/entity/Entity";
import { GeometryTypeEnum } from "../../src/entity/geometry/Geometry";
import { DENSIFY_STEP, GeometryHandler, densifyPath } from "../../src/entity/geometry/GeometryHandler";
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
    handler._directions = true;
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
            let k = g._polyVerticesHandlerIndex / 2;
            for (const p of rings.flat()) {
                expectDirection(at(handler._polyDirectionsHigh, handler._polyDirectionsLow, k++), direction(p));
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
            return handler._directions;
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
    const vertices = (directions) => {
        const handler = new GeometryHandler({});
        handler._directions = directions;
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
