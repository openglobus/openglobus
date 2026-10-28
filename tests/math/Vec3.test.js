import { Vec3 } from "../../src/math/Vec3";

describe("Vec3 slerp", () => {
    test("interpolates the direction and leaves both vectors as they are", () => {
        const a = new Vec3(1, 0, 0),
            b = new Vec3(0, 1, 0);

        const res = a.slerp(b, 0.5);

        expect(res.x).toBeCloseTo(Math.SQRT1_2, 12);
        expect(res.y).toBeCloseTo(Math.SQRT1_2, 12);
        expect(a).toEqual(new Vec3(1, 0, 0));
        expect(b).toEqual(new Vec3(0, 1, 0));
    });
});
