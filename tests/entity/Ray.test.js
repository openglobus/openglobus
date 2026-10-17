import { EntityCollection } from "../../src/entity/EntityCollection";
import { Entity } from "../../src/entity/Entity";
import { Ray } from "../../src/entity/ray/Ray";
import { Vec3 } from "../../src/math/Vec3";

test("Testing Ray", () => {
    let ray = new Ray();

    ray.setStartPosition(0, 0, 0);
    ray.setEndPosition(1, 1, 1);

    expect(ray.getStartPosition()).toStrictEqual(new Vec3(0, 0, 0));
    expect(ray.getEndPosition()).toStrictEqual(new Vec3(1, 1, 1));

    ray.setStartPosition3v(new Vec3(1, 1, 1));
    ray.setEndPosition3v(new Vec3(0, 0, 0));

    expect(ray.getStartPosition()).toStrictEqual(new Vec3(1, 1, 1));
    expect(ray.getEndPosition()).toStrictEqual(new Vec3(0, 0, 0));

    ray.setThickness(1);

    ray.setColors4v({ x: 1, y: 1, z: 1, w: 1 }, { x: 0, y: 1, z: 0, w: 1 });
    ray.setColorsHTML("blue", "#f0f8ff");

    expect(ray.getVisibility()).toBe(true);
});

function startPositions(handler) {
    const high = handler._startPositionHighArr;
    const low = handler._startPositionLowArr;
    const res = [];
    for (let i = 0; i < high.length; i += 18) {
        res.push(new Vec3(high[i] + low[i], high[i + 1] + low[i + 1], high[i + 2] + low[i + 2]));
    }
    return res;
}

test("Ray positions follow the collection relative center", () => {
    const ec = new EntityCollection();
    const handler = ec.rayHandler;
    const start = new Vec3(6378137, 10, 20);
    const end = new Vec3(6378237, 10, 20);
    const center = new Vec3(6378100, 0, 0);

    ec.add(new Entity({ ray: { startPosition: start.clone(), endPosition: end.clone() } }));
    handler.setRelativeCenter(center);

    const [first] = startPositions(handler);
    expect(first.length()).toBeLessThan(100);
    expect(first.add(center).distance(start)).toBeLessThan(1e-3);

    ec.add(new Entity({ ray: { startPosition: end.clone(), endPosition: start.clone() } }));
    const positions = startPositions(handler);
    expect(positions.length).toBe(2);
    expect(positions[1].add(center).distance(end)).toBeLessThan(1e-3);
});
