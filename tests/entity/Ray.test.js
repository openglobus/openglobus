import { Ray } from "../../src/og/entity/Ray";
import { Vec3 } from "../../src/og/math/Vec3";

test('Testing Ray', () => {
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
    ray.setColorsHTML('blue', '#f0f8ff');

    expect(ray.getVisibility()).toBe(true);
});