import { LonLat } from "../../src/LonLat";
import { Vec3 } from "../../src/math/Vec3";
import * as mercator from "../../src/mercator";
import { EarthQuadTreeStrategy } from "../../src/quadTree/earth/EarthQuadTreeStrategy";
import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { wgs84 } from "../../src/ellipsoid/wgs84";

//
// The deepest zooms: a 30 zoom tile is a few centimeters, its Web Mercator coordinates are millions of meters.
//
const MAX_ZOOM = 35;

const GRID_SIZE_BY_ZOOM = [64, 32, 16, 8];
for (let z = GRID_SIZE_BY_ZOOM.length; z <= MAX_ZOOM; z++) GRID_SIZE_BY_ZOOM.push(4);

const POINTS = [new LonLat(24.5, 25.0), new LonLat(-122.4194, 37.7749), new LonLat(139.6917, 35.6895)];

function createEarth() {
    const planet = {
        _createdNodesCount: 0,
        ellipsoid: wgs84,
        terrain: { gridSizeByZoom: GRID_SIZE_BY_ZOOM, minZoom: 2, maxZoom: MAX_ZOOM, equalizeVertices: true },
        renderer: { handler: {}, requestRedraw: () => {} },
        transitionTime: 580
    };
    const init = vi.spyOn(QuadTreeStrategy.prototype, "init").mockImplementation(() => {});
    const qts = new EarthQuadTreeStrategy({ planet });
    qts.init({});
    init.mockRestore();
    return qts;
}

// The nodes from the Mercator root down to the zoom over the point; beforeChildren runs before a node is split
function createPath(qts, lonLat, zoom, beforeChildren) {
    const merc = lonLat.forwardMercator(),
        path = [qts.quadTreeList[0]];

    while (path.length <= zoom) {
        const node = path[path.length - 1];
        beforeChildren && beforeChildren(node);
        node.createChildNodes();
        path.push(node.nodes.find((n) => n.segment._extent.isInside(merc)));
    }

    return path;
}

// The surface point of the tile at the fractions of its width from the west and of its height from the north
function surfacePoint(seg, u, v) {
    const e = seg.getExtent();
    return wgs84.lonLatToCartesian(
        seg.getLonLat(e.southWest.lon + u * e.getWidth(), e.northEast.lat - v * e.getHeight())
    );
}

// Surface points of the tile in a 5 x 5 grid, raised to the radii
function tileSurface(seg, radii) {
    const points = [];
    for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
            const p = surfacePoint(seg, j / 4, i / 4);
            for (const r of radii) {
                points.push(r ? p.scaleTo(r / p.length()) : p);
            }
        }
    }
    return points;
}

function expectSphereHolds(seg, points) {
    const { center, radius } = seg.bsphere;
    for (const p of points) {
        expect(center.distance(p)).toBeLessThanOrEqual(radius * (1 + 1e-9) + 1e-9);
    }
}

// Plain vertices of the segment raised by the height, relative to its center, as a terrain worker makes them
function setRaisedVertices(seg, height) {
    const gs = seg.gridSize,
        e = seg.getExtent(),
        c = seg._relativeCenter,
        v = new Float64Array((gs + 1) * (gs + 1) * 3);

    for (let i = 0, k = 0; i <= gs; i++) {
        for (let j = 0; j <= gs; j++) {
            const ll = seg.getLonLat(e.southWest.lon + (j / gs) * e.getWidth(), e.northEast.lat - (i / gs) * e.getHeight());
            const p = wgs84.lonLatToCartesian(new LonLat(ll.lon, ll.lat, height));
            v[k++] = p.x - c.x;
            v[k++] = p.y - c.y;
            v[k++] = p.z - c.z;
        }
    }

    seg.terrainVertices = seg.renderVertices = v;
}

describe("tile indexes on the deep zooms", () => {
    test.each(POINTS)("child indexes follow the parent down to zoom 30 at %s", (lonLat) => {
        const path = createPath(createEarth(), lonLat, MAX_ZOOM);

        for (let z = 1; z <= MAX_ZOOM; z++) {
            const node = path[z],
                s = node.segment,
                ps = path[z - 1].segment;

            expect(s.tileZoom).toBe(z);
            expect(s.tileX).toBe(ps.tileX * 2 + (node.partId & 1));
            expect(s.tileY).toBe(ps.tileY * 2 + (node.partId >> 1));
        }
    });

    test.each(POINTS)("the extent is the grid cell of the index at %s", (lonLat) => {
        const path = createPath(createEarth(), lonLat, MAX_ZOOM);

        for (let z = 20; z <= MAX_ZOOM; z++) {
            const s = path[z].segment,
                e = s.getExtent(),
                size = mercator.POLE2 / 2 ** z;

            // Within a thousandth of the tile, the index is off by whole tiles when it is wrong
            expect(Math.abs(e.southWest.lon - (-mercator.POLE + s.tileX * size))).toBeLessThan(size * 1e-3);
            expect(Math.abs(e.northEast.lat - (mercator.POLE - s.tileY * size))).toBeLessThan(size * 1e-3);
        }
    });
});

describe("node ids on the deep zooms", () => {
    test("ids keep the formula while it is exact, siblings never share an id", () => {
        const path = createPath(createEarth(), POINTS[0], MAX_ZOOM);
        const seen = new Set();

        for (let z = 1; z <= MAX_ZOOM; z++) {
            const parent = path[z - 1];
            const ids = parent.nodes.map((n) => n.nodeId);

            expect(new Set(ids).size).toBe(4);

            for (const n of parent.nodes) {
                expect(n.nodeId).not.toBe(-1);
                expect(seen.has(n.nodeId)).toBe(false);
                seen.add(n.nodeId);

                const formula = n.partId + parent.nodeId * 4 + 1;
                if (parent.nodeId >= 0 && formula <= Number.MAX_SAFE_INTEGER) {
                    // Entity collection nodes find the planet nodes by these ids
                    expect(n.nodeId).toBe(formula);
                } else {
                    expect(n.nodeId).toBeLessThan(-1);
                }
            }
        }

        // The formula is out of the safe integers from zoom 27
        expect(path[26].nodeId).toBeGreaterThanOrEqual(0);
        expect(path[27].nodeId).toBeLessThan(-1);
    });
});

describe("tile bounds from the parent", () => {
    const TERRAIN_ZOOM = 10;

    // The path with the terrain ready at TERRAIN_ZOOM: raised plain vertices and their radius range
    function createTerrainPath(lonLat, height, range) {
        let terrainSegment = null;

        const path = createPath(createEarth(), lonLat, MAX_ZOOM, (node) => {
            const s = node.segment;
            if (s.tileZoom === TERRAIN_ZOOM) {
                setRaisedVertices(s, height);
                s.fileGridSize = s.gridSize;
                s.terrainReady = true;
                s.terrainExists = true;
                const r = s.bsphere.center.length();
                s.setTerrainRadiusRange(range ? [r + range[0], r + range[1]] : null);
                terrainSegment = s;
            }
        });

        return { path, terrainSegment };
    }

    test("while the parent grid covers the segment, it takes the parent volume", () => {
        const { path, terrainSegment } = createTerrainPath(POINTS[0], 0, [-500, 9000]);

        // 4 grid cells at TERRAIN_ZOOM are 2 cells at the next zoom and 1 cell further
        for (const z of [TERRAIN_ZOOM + 1, TERRAIN_ZOOM + 2]) {
            const s = path[z].segment;
            expect(s.bsphere.center.equal(terrainSegment.bsphere.center)).toBe(true);
            expect(s.bsphere.radius).toBe(terrainSegment.bsphere.radius);
            expectSphereHolds(s, tileSurface(s, [0]));
        }
    });

    test.each(POINTS)("inside a far parent cell the volume holds the tile between the radii at %s", (lonLat) => {
        const { path, terrainSegment } = createTerrainPath(lonLat, 0, [-500, 9000]);

        for (let z = TERRAIN_ZOOM + 3; z <= MAX_ZOOM; z++) {
            const s = path[z].segment;
            expectSphereHolds(s, tileSurface(s, [terrainSegment.minTerrainRadius, terrainSegment.maxTerrainRadius]));
        }
    });

    test.each(POINTS)("with no radius range the volume fits the tile surface at %s", (lonLat) => {
        const { path } = createTerrainPath(lonLat, 0, null);

        for (let z = TERRAIN_ZOOM + 3; z <= MAX_ZOOM; z++) {
            const s = path[z].segment,
                diagonal = surfacePoint(s, 0, 0).distance(surfacePoint(s, 1, 1));

            expectSphereHolds(s, tileSurface(s, [0]));

            // Not the parent volume: about the half diagonal of the tile, a 30 zoom one is centimeters
            expect(s.bsphere.radius).toBeLessThan(diagonal);
        }
    });

    test("a big tile is held over the -90 meridian inside it", () => {
        const s = createPath(createEarth(), new LonLat(-45, 30), 1)[1].segment;
        s.setBoundsByRadii(6370000, 6380000);
        expectSphereHolds(s, tileSurface(s, [6370000, 6380000]));
    });
});

describe("terrain from a far parent", () => {
    test.each(POINTS)("vertices are at the parent height over their own corners at %s", (lonLat) => {
        const HEIGHT = 1000.0;
        let terrainNode = null;

        const path = createPath(createEarth(), lonLat, MAX_ZOOM, (node) => {
            const s = node.segment;
            if (s.tileZoom === 10) {
                setRaisedVertices(s, HEIGHT);
                s.fileGridSize = s.gridSize;
                s.terrainReady = true;
                terrainNode = node;
            }
        });

        for (const z of [16, 22, 27, MAX_ZOOM]) {
            const node = path[z],
                s = node.segment;

            node.whileTerrainLoading();

            expect(node.appliedTerrainNodeId).toBe(terrainNode.nodeId);
            // A cell of the far parent is taken, its 4 vertices are interpolated
            expect(s.gridSize).toBe(1);

            const corners = [surfacePoint(s, 0, 0), surfacePoint(s, 1, 0), surfacePoint(s, 0, 1), surfacePoint(s, 1, 1)];

            for (let k = 0; k < 4; k++) {
                const v = s.renderVertices,
                    c = s._relativeCenter,
                    p = new Vec3(v[k * 3] + c.x, v[k * 3 + 1] + c.y, v[k * 3 + 2] + c.z),
                    ll = wgs84.cartesianToLonLat(p);

                // A plane through the parent cell is about a meter under the curved surface there
                expect(Math.abs(ll.height - HEIGHT)).toBeLessThan(0.01);

                // Over the own corner of the tile, a neighbour one is a tile side away
                const ground = wgs84.lonLatToCartesian(new LonLat(ll.lon, ll.lat, 0)),
                    side = corners[0].distance(corners[1]);
                expect(ground.distance(corners[k])).toBeLessThan(Math.min(0.25 * side, 0.01));
            }
        }
    });
});
