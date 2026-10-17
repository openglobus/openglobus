import { EntityCollection } from "../../src/entity/EntityCollection";
import { Entity } from "../../src/entity/Entity";
import { Strip } from "../../src/entity/strip/Strip";
import { Vec3 } from "../../src/math/Vec3";

// Positions are kept as high and low float pairs, so a vertex is the sum of the two.
function vertices(strip) {
    const high = strip._verticesHigh;
    const low = strip._verticesLow;
    const result = [];

    for (let i = 0; i < high.length; i += 3) {
        result.push(new Vec3(high[i] + low[i], high[i + 1] + low[i + 1], high[i + 2] + low[i + 2]));
    }

    return result;
}

function distanceToNearest(point, corners) {
    return Math.min(...corners.map((corner) => point.distance(corner)));
}

test("Strip builds a quad on the corners of its two edges", () => {
    const corners = [
        new Vec3(6378137, 0, 0),
        new Vec3(6378437, 0, 0),
        new Vec3(6378137, 10, 0),
        new Vec3(6378437, 10, 0)
    ];

    const strip = new Strip({
        path: [
            [corners[0], corners[1]],
            [corners[2], corners[3]]
        ]
    });

    const built = vertices(strip);

    expect(built).toHaveLength(4);

    for (const vertex of built) {
        expect(distanceToNearest(vertex, corners)).toBeLessThan(1e-6);
    }
});

// A repeated position - a hovering platform, or telemetry that carries the coordinate
// over several frames - leaves the quad without rails to intersect. Its vertices must
// stay on the edge itself instead of falling back to the coordinate origin.
test("Strip keeps a quad with a repeated edge collapsed onto that edge", () => {
    const bottom = new Vec3(6378137, 0, 0);
    const top = new Vec3(6378437, 0, 0);

    const strip = new Strip({
        path: [
            [bottom, top],
            [bottom, top]
        ]
    });

    const built = vertices(strip);

    expect(built).toHaveLength(4);

    for (const vertex of built) {
        expect(distanceToNearest(vertex, [bottom, top])).toBeLessThan(1e-6);
    }
});

test("Strip keeps vertices relative to the collection relative center", () => {
    const corners = [
        new Vec3(6378137, 0, 0),
        new Vec3(6378437, 0, 0),
        new Vec3(6378137, 10, 0),
        new Vec3(6378437, 10, 0)
    ];
    const ec = new EntityCollection();
    const entity = new Entity({
        strip: {
            path: [
                [corners[0], corners[1]],
                [corners[2], corners[3]]
            ]
        }
    });
    ec.add(entity);

    const center = new Vec3(6378200, 5, 0);
    ec.stripHandler.setRelativeCenter(center);

    for (const v of vertices(entity.strip)) {
        expect(v.length()).toBeLessThan(300);
        expect(distanceToNearest(v.add(center), corners)).toBeLessThan(1e-3);
    }
});
