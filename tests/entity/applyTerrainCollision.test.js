import { describe, expect, test, vi } from "vitest";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Vec3 } from "../../src/math/Vec3";
import { EPSG3857 } from "../../src/proj/EPSG3857";
import { EPSG4326 } from "../../src/proj/EPSG4326";
import { cube } from "../../src/proj/cube";

const GROUND = new Vec3(1, 2, 3);

// A rendered tile of the projection around the native point, its terrain point is GROUND
function tileNode(projection, native, projectNative) {
    return {
        segment: {
            _projection: projection,
            _extent: new Extent(
                new LonLat(native.lon - 1e-3, native.lat - 1e-3),
                new LonLat(native.lon + 1e-3, native.lat + 1e-3)
            ),
            projectNative: vi.fn(projectNative),
            getTerrainPoint: vi.fn((xyz, ll, res) => res.copy(GROUND))
        }
    };
}

// A collection of a ground layer with a polyline of the one point
function groundPolyline(lonLat) {
    const ec = new EntityCollection();
    ec._layer = { clampToGround: true, relativeToGround: false, _planet: { ellipsoid: wgs84 } };

    const polyline = {
        // Not a valid extent, so the polyline is taken at every view
        _extent: new Extent(new LonLat(1, 1), new LonLat(-1, -1)),
        _pathLonLatMerc: [[lonLat.forwardMercator()]],
        getPathLonLat: () => [[[lonLat.lon, lonLat.lat]]],
        getPath3v: () => [[wgs84.lonLatToCartesian(lonLat)]],
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
