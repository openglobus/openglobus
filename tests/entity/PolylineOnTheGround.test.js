import { describe, expect, test } from "vitest";
import { LonLat } from "../../src/LonLat";
import { Vec3 } from "../../src/math/Vec3";
import { wgs84 } from "../../src/ellipsoid/wgs84";
import { Polyline } from "../../src/entity/polyline/Polyline";
import { checkHandler, createCollection, lonLatTrack } from "./polylineArrays";

const GROUND_HEIGHT = 500;

// A polyline of a layer, its points are put down to the ground at GROUND_HEIGHT as the clamping does
function setup(layer) {
    const { entityCollection, handler } = createCollection();
    entityCollection._layer = layer;

    const paths = [lonLatTrack(10, 10, 4, 0.001, 0), lonLatTrack(11, 10, 3, 0.001, 0)];
    const polyline = new Polyline({ pathLonLat: paths.map((seg) => seg.map((ll) => ll.clone())) });
    handler.add(polyline);

    // A neighbour in the same batch, its points must stay as they are
    const other = new Polyline({ pathLonLat: [lonLatTrack(20, 20, 3, 0.001, 0)] });
    handler.add(other);

    const ground = paths.map((seg) =>
        seg.map((ll) => wgs84.lonLatToCartesian(new LonLat(ll.lon, ll.lat, GROUND_HEIGHT)))
    );
    ground.forEach((seg, j) => seg.forEach((p, i) => polyline.setPoint3v(p, i, j, true)));

    const model = new Map([
        [polyline, ground],
        [other, [lonLatTrack(20, 20, 3, 0.001, 0).map((ll) => wgs84.lonLatToCartesian(ll))]]
    ]);

    return { handler, polyline, other, ground, model };
}

// The point of the segment in the vertex arrays of the batch, one of the four copies of it
function batchVertex(polyline, segmentIndex, index) {
    const br = polyline._batchRenderer,
        b = polyline._batchRendererIndexes[segmentIndex],
        k = br._pathLengths[b] * 12 + 24 * b + 12 + index * 12,
        h = br._verticesHigh,
        l = br._verticesLow;
    return new Vec3(h[k] + l[k], h[k + 1] + l[k + 1], h[k + 2] + l[k + 2]);
}

const moved = () => [lonLatTrack(10.5, 10.2, 4, 0.001, 0), lonLatTrack(11.5, 10.2, 3, 0.001, 0)];

describe("a polyline with a new path of the same size", () => {
    test.each([
        ["clamped to the ground", { clampToGround: true }],
        ["relative to the ground", { relativeToGround: true }]
    ])("%s keeps the distances from the center of its points", (_, layer) => {
        const { polyline, other, ground } = setup(layer);
        const next = moved(),
            given = next.map((seg) => seg.map((ll) => ll.clone())),
            otherBefore = batchVertex(other, 0, 1);

        polyline.setPathLonLatFast(given);

        const path = polyline.getPath3v();
        next.forEach((seg, j) =>
            seg.forEach((ll, i) => {
                const direction = wgs84.lonLatToCartesian(ll).normalize();
                expect(path[j][i].length()).toBeCloseTo(ground[j][i].length(), 6);
                expect(path[j][i].normal().distance(direction)).toBeLessThan(1e-12);
                expect(batchVertex(polyline, j, i).distance(path[j][i])).toBeLessThan(1e-2);
            })
        );

        // The path given stays as it is
        expect(given.map((seg) => seg.map((ll) => ll.height))).toEqual(next.map((seg) => seg.map((ll) => ll.height)));
        expect(batchVertex(other, 0, 1).distance(otherBefore)).toBe(0);
    });

    test("off the ground takes the heights of the path", () => {
        const { handler, polyline, model } = setup({ clampToGround: false, relativeToGround: false });
        const next = moved();

        polyline.setPathLonLatFast(next.map((seg) => seg.map((ll) => ll.clone())));

        model.set(
            polyline,
            next.map((seg) => seg.map((ll) => wgs84.lonLatToCartesian(ll)))
        );
        checkHandler(handler, model);
    });
});
