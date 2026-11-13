import { describe, expect, test } from "vitest";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";
import { CUBE_FACES } from "../../src/proj/cube";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { NE, NW, SE, SW } from "../../src/quadTree/quadTree";
import { CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { VectorTileCreator } from "../../src/utils/VectorTileCreator";
import { createRandom, createStrategy } from "../quadTree/quadTreeScene";

const f = Math.fround;
const TILE_PIXELS = 256;

// proj() of the plane vector tile shader with every operation in floats, as the GPU does it, w is the last value
function projFloat(high, low, plane) {
    const q = [0, 1, 2].map((i) => f(f(high[i] - plane.centerHigh[i]) + f(low[i] - plane.centerLow[i])));
    const dot = (a, b) => f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2]));
    const qc = dot(q, plane.axisC);
    let pc = f(f(dot(plane.centerHigh, plane.axisC) + dot(plane.centerLow, plane.axisC)) + qc);
    if (Math.abs(pc) < 1e-7) pc = -1e-7;

    let dx = f(f(dot(q, plane.axisU) - f(plane.center[0] * qc)) / pc),
        dy = f(f(dot(q, plane.axisV) - f(plane.center[1] * qc)) / pc);

    if (plane.equiangular && pc > 0) {
        dx = f(Math.atan2(dx, f(1 + f(plane.center[0] * f(plane.center[0] + dx)))));
        dy = f(Math.atan2(dy, f(1 + f(plane.center[1] * f(plane.center[1] + dy)))));
    }

    return [f(dx * plane.scale[0]), -f(dy * plane.scale[1]), pc];
}

// Whether the ray from the point in the direction crosses the square from -1 to 1
function rayHitsTile([x, y], [dx, dy]) {
    let t0 = 0,
        t1 = Infinity;
    for (const [p, d] of [
        [x, dx],
        [y, dy]
    ]) {
        if (Math.abs(d) < 1e-300) {
            if (p < -1 || p > 1) return false;
            continue;
        }
        let a = (-1 - p) / d,
            b = (1 - p) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
    }
    return t0 <= t1;
}

const RAD = Math.PI / 180;
const toLonLat = ([x, y, z]) => [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
const angle = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));

// The tile position of the point on the extended plane of the tile face, from -1 to 1 over the tile
function exactClip(lonLat, segment, equiangular) {
    const face = segment.tileGroup,
        fc = CUBE_FACES[face],
        lon = (lonLat[0] * Math.PI) / 180,
        lat = (lonLat[1] * Math.PI) / 180,
        p = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)],
        d = p[0] * fc[0] + p[1] * fc[1] + p[2] * fc[2],
        a = (p[0] * fc[3] + p[1] * fc[4] + p[2] * fc[5]) / d,
        b = (p[0] * fc[6] + p[1] * fc[7] + p[2] * fc[8]) / d,
        fromPlane = (x) => (equiangular ? Math.atan(x) / (Math.PI / 2) + 0.5 : (x + 1) * 0.5),
        e = segment.getExtent(),
        s0 = e.southWest.lon - face,
        s1 = e.northEast.lon - face,
        t0 = e.southWest.lat,
        t1 = e.northEast.lat;

    return [((fromPlane(a) - (s0 + s1) / 2) * 2) / (s1 - s0), -((fromPlane(b) - (t0 + t1) / 2) * 2) / (t1 - t0)];
}

function getSegment(qts, face, path) {
    let node = qts.quadTreeList[face];
    for (const part of path) {
        node.createChildNodes();
        node = node.nodes[part];
    }
    return node.segment;
}

const PARTS = [NW, NE, SW, SE];

describe.each([
    ["gnomonic", CubeQuadTreeStrategy, false],
    ["equiangular", EquiangularCubeQuadTreeStrategy, true]
])("the plane of a %s cube tile", (_, Strategy, equiangular) => {
    test.each([0, 3, 8, 14, 20, 24])(
        "puts the vertices on the tile within a hundredth of a pixel at zoom %i",
        (zoom) => {
            const qts = createStrategy(Strategy),
                random = createRandom(1000 + zoom),
                creator = new VectorTileCreator({});

            let worst = 0;

            for (let face = 0; face < 6; face++) {
                const segment = getSegment(
                        qts,
                        face,
                        Array.from({ length: zoom }, () => PARTS[Math.floor(random() * 4)])
                    ),
                    plane = creator._getTilePlane(segment),
                    e = segment.getExtent();

                expect(plane).not.toBe(null);

                for (let i = 0; i < 200; i++) {
                    // Inside the tile and a tile around it
                    const ll = segment.getLonLat(
                            e.southWest.lon + (random() * 3 - 1) * e.getWidth(),
                            e.southWest.lat + (random() * 3 - 1) * e.getHeight()
                        ),
                        high = [],
                        low = [];

                    GeometryHandler.appendPolygonDirections([[[ll.lon, ll.lat]]], high, low);

                    const got = projFloat(high, low, plane),
                        want = exactClip([ll.lon, ll.lat], segment, equiangular);

                    worst = Math.max(worst, Math.abs(got[0] - want[0]), Math.abs(got[1] - want[1]));
                }
            }

            expect(worst * (TILE_PIXELS / 2)).toBeLessThan(0.01);
        }
    );

    test("puts a vertex of the next face on the tile on the edge where it is", () => {
        const qts = createStrategy(Strategy),
            creator = new VectorTileCreator({});

        // The east tile of the front face at zoom 6, the point is a bit over the edge, on the right face
        const segment = getSegment(qts, 1, [NE, SE, NE, SE, NE, SE]),
            plane = creator._getTilePlane(segment),
            e = segment.getExtent(),
            ll = segment.getLonLat(e.northEast.lon - 1e-9, (e.southWest.lat + e.northEast.lat) / 2),
            over = [ll.lon + 0.01, ll.lat],
            high = [],
            low = [];

        GeometryHandler.appendPolygonDirections([[over]], high, low);

        const got = projFloat(high, low, plane),
            want = exactClip(over, segment, equiangular);

        expect(want[0]).toBeGreaterThan(1);
        expect(Math.abs(got[0] - want[0]) * (TILE_PIXELS / 2)).toBeLessThan(0.01);
        expect(Math.abs(got[1] - want[1]) * (TILE_PIXELS / 2)).toBeLessThan(0.01);
    });

    test("is not made for a tile of another projection", () => {
        const creator = new VectorTileCreator({});
        expect(creator._getTilePlane({ _projection: EPSG3857, tileGroup: 0 })).toBe(null);
    });
});

describe.each([
    ["gnomonic", CubeQuadTreeStrategy],
    ["equiangular", EquiangularCubeQuadTreeStrategy]
])("a %s cube tile and a triangle behind its plane", (_, Strategy) => {
    // A triangle reaches the tile only if it is large: its edges from a vertex in front of the plane, outside the
    // face, to a vertex behind it are clipped by the plane and go away from the tile
    test("the clipped edge does not cross the tile", () => {
        const qts = createStrategy(Strategy),
            random = createRandom(77),
            creator = new VectorTileCreator({});

        let checked = 0;

        for (let face = 0; face < 6; face++) {
            for (let zoom = 0; zoom <= 4; zoom++) {
                const segment = getSegment(
                        qts,
                        face,
                        Array.from({ length: zoom }, () => PARTS[Math.floor(random() * 4)])
                    ),
                    plane = creator._getTilePlane(segment),
                    fc = CUBE_FACES[face],
                    c = [fc[0], fc[1], fc[2]];

                for (let i = 0; i < 2000; i++) {
                    // Two points less than 35 degrees apart, the first one 55 to 90 degrees from the face center,
                    // the second one behind the plane
                    const rnd = () => {
                            const v = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1],
                                l = Math.hypot(...v);
                            return v.map((x) => x / l);
                        },
                        a = rnd(),
                        r = rnd(),
                        bv = a.map((x, k) => x + 0.6 * r[k]),
                        bl = Math.hypot(...bv),
                        b = bv.map((x) => x / bl);

                    if (angle(a, c) < 55 * RAD || angle(a, c) > 89 * RAD) continue;
                    if (angle(b, c) <= 90.5 * RAD || angle(a, b) > 35 * RAD) continue;

                    const proj = (v) => {
                        const high = [],
                            low = [];
                        GeometryHandler.appendPolygonDirections([[toLonLat(v)]], high, low);
                        return projFloat(high, low, plane);
                    };

                    const pa = proj(a),
                        pb = proj(b);

                    expect(pa[2]).toBeGreaterThan(0);
                    expect(pb[2]).toBeLessThan(0);
                    expect(rayHitsTile(pa, [pa[0] - pb[0], pa[1] - pb[1]])).toBe(false);
                    checked++;
                }
            }
        }

        expect(checked).toBeGreaterThan(100);
    });
});
