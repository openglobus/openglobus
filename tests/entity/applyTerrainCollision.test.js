import { describe, expect, test, vi } from "vitest";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Vec3 } from "../../src/math/Vec3";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { EPSG4326 } from "../../src/proj/EPSG4326";
import { cube } from "../../src/proj/cube";
import { Segment } from "../../src/segment/Segment";

const GROUND = new Vec3(1, 2, 3);

// A rendered tile of the projection around the native point, its terrain point is the ground one
function tileNode(projection, native, projectNative, { half = 1e-3, ground = GROUND } = {}) {
    return {
        segment: {
            _projection: projection,
            renderVertices: [0, 0, 0],
            _extent: new Extent(
                new LonLat(native.lon - half, native.lat - half),
                new LonLat(native.lon + half, native.lat + half)
            ),
            projectNative: vi.fn(projectNative),
            getTerrainPoint: vi.fn((xyz, ll, res) => res.copy(ground))
        }
    };
}

// A collection of a ground layer with a polyline through the points, on the ellipsoid or at the given places
function groundPolyline(lonLats, carts) {
    const points = [].concat(lonLats);
    const ec = new EntityCollection();
    ec._layer = { clampToGround: true, relativeToGround: false, _planet: { ellipsoid: wgs84 } };

    const polyline = {
        // Not a valid extent, so the polyline is taken at every view
        _extent: new Extent(new LonLat(1, 1), new LonLat(-1, -1)),
        _pathLonLatMerc: [points.map((p) => p.forwardMercator())],
        getPathLonLat: () => [points.map((p) => [p.lon, p.lat])],
        getPath3v: () => [carts || points.map((p) => wgs84.lonLatToCartesian(p))],
        altitude: 0,
        setPoint3v: vi.fn()
    };

    ec._entities = [{ polyline, _altitude: 0 }];

    return { ec, polyline };
}

const viewExtent = Extent.createFromArray([-180, -90, 180, 90]);

describe("a polyline on the ground", () => {
    test("goes down to a cube tile in the face coordinates", () => {
        const lonLat = new LonLat(37.3, 61.8),
            native = cube.fromLonLat(lonLat),
            node = tileNode(cube, native, (ll) => cube.fromLonLat(ll)),
            { ec, polyline } = groundPolyline(lonLat);

        ec.applyTerrainCollision([node], viewExtent);

        const [, ll] = node.segment.getTerrainPoint.mock.calls[0];
        expect(ll.lon).toBeCloseTo(native.lon, 12);
        expect(ll.lat).toBeCloseTo(native.lat, 12);
        expect(polyline.setPoint3v).toHaveBeenCalledWith(GROUND, 0, 0, true);
    });

    test("a Mercator tile takes the Mercator path as it is", () => {
        const lonLat = new LonLat(8.19, 46.73),
            node = tileNode(EPSG3857, lonLat.forwardMercator(), (ll) => ll.forwardMercator()),
            { ec, polyline } = groundPolyline(lonLat);

        ec.applyTerrainCollision([node], viewExtent);

        expect(node.segment.projectNative).not.toHaveBeenCalled();
        expect(node.segment.getTerrainPoint.mock.calls[0][1]).toBe(polyline._pathLonLatMerc[0][0]);
        expect(polyline.setPoint3v).toHaveBeenCalledWith(GROUND, 0, 0, true);
    });

    test("goes down to an Earth polar cap tile in lon/lat", () => {
        const lonLat = new LonLat(-40, 88.5),
            mercator = tileNode(EPSG3857, new LonLat(0, 0), (ll) => ll.forwardMercator()),
            polar = tileNode(EPSG4326, lonLat, (ll) => ll),
            { ec, polyline } = groundPolyline(lonLat);

        // The nodes are taken from the end
        ec.applyTerrainCollision([polar, mercator], viewExtent);

        expect(mercator.segment.getTerrainPoint).not.toHaveBeenCalled();
        expect(polar.segment.getTerrainPoint).toHaveBeenCalledTimes(1);
        expect(polyline.setPoint3v).toHaveBeenCalledWith(GROUND, 0, 0, true);
    });
});

describe("the tile of the previous point", () => {
    const mercatorNode = (lon, lat, ground) =>
        tileNode(EPSG3857, new LonLat(lon, lat).forwardMercator(), (ll) => ll.forwardMercator(), {
            half: 5000,
            ground
        });

    test("is taken first, the other tiles are not looked at", () => {
        const here = mercatorNode(10, 45),
            there = mercatorNode(20, 45),
            line = [0, 1, 2, 3, 4].map((k) => new LonLat(10 + k * 0.01, 45)),
            { ec, polyline } = groundPolyline(line),
            looked = vi.spyOn(there.segment._extent, "isInside");

        ec.applyTerrainCollision([here, there], viewExtent);

        expect(here.segment.getTerrainPoint).toHaveBeenCalledTimes(line.length);
        expect(polyline.setPoint3v).toHaveBeenCalledTimes(line.length);
        // Only the first point of the line looks for its tile among all of them
        expect(looked).toHaveBeenCalledTimes(1);
    });

    test("a point on another tile finds its own one", () => {
        const westGround = new Vec3(1, 0, 0),
            eastGround = new Vec3(0, 1, 0),
            west = mercatorNode(10, 45, westGround),
            east = mercatorNode(10.1, 45, eastGround),
            line = [0, 1, 2, 6, 7, 8].map((k) => new LonLat(9.98 + k * 0.02, 45)),
            { ec, polyline } = groundPolyline(line),
            grounds = [];

        // The point is the same vector for all the calls, so it is copied at the call
        polyline.setPoint3v.mockImplementation((v, k) => (grounds[k] = v.clone()));

        ec.applyTerrainCollision([west, east], viewExtent);

        expect(grounds.length).toBe(line.length);
        line.forEach((ll, k) => expect(grounds[k].equal(ll.lon < 10.05 ? westGround : eastGround)).toBe(true));
    });
});

describe("a clamped point", () => {
    const lonLat = new LonLat(8.19, 46.73);
    const node = () => tileNode(EPSG3857, lonLat.forwardMercator(), (ll) => ll.forwardMercator());

    test("stays when the ground is where it is", () => {
        const { ec, polyline } = groundPolyline(lonLat, [new Vec3(GROUND.x, GROUND.y, GROUND.z + 1e-6)]);

        ec.applyTerrainCollision([node()], viewExtent);

        expect(polyline.setPoint3v).not.toHaveBeenCalled();
    });

    test("moves to the ground a centimeter away", () => {
        const { ec, polyline } = groundPolyline(lonLat, [new Vec3(GROUND.x, GROUND.y, GROUND.z + 0.01)]);

        ec.applyTerrainCollision([node()], viewExtent);

        expect(polyline.setPoint3v).toHaveBeenCalledWith(GROUND, 0, 0, true);
    });
});

test("a point on a tile with no vertices yet stays where it is", () => {
    const lonLat = new LonLat(8.19, 46.73, 900),
        node = tileNode(EPSG3857, lonLat.forwardMercator(), (ll) => ll.forwardMercator());

    Object.assign(node.segment, { renderVertices: null, planet: { ellipsoid: wgs84 } });
    node.segment.getTerrainPoint = Segment.prototype.getTerrainPoint;

    const { ec, polyline } = groundPolyline(lonLat, [wgs84.lonLatToCartesian(lonLat)]);

    ec.applyTerrainCollision([node], viewExtent);

    expect(polyline.setPoint3v).not.toHaveBeenCalled();

    // The terrain comes, the point goes down to it
    node.segment.renderVertices = [0, 0, 0];
    node.segment.getTerrainPoint = vi.fn((xyz, ll, res) => res.copy(GROUND));

    ec.applyTerrainCollision([node], viewExtent);

    expect(polyline.setPoint3v).toHaveBeenCalledWith(GROUND, 0, 0, true);
});
