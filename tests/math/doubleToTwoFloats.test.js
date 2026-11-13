import { describe, test, expect } from "vitest";
import {
    doubleToTwoFloat32Array,
    doubleToTwoFloats2,
    doubleToTwoFloatsV2,
    doubleToTwoFloatsV3
} from "../../src/math/doubleToTwoFloats";

// The former split, one branch per sign
function reference(x) {
    if (x >= 0.0) {
        let d = Math.floor(x / 65536.0) * 65536.0;
        return [Math.fround(d), Math.fround(x - d)];
    }
    let d = Math.floor(-x / 65536.0) * 65536.0;
    return [Math.fround(-d), Math.fround(x + d)];
}

const VALUES = [
    0,
    -0,
    1,
    -1,
    0.3,
    -0.3,
    65535.9,
    65536,
    -65536,
    65536.5,
    -65536.5,
    6378137.123456789,
    -6378137.123456789,
    1e15 + 0.3,
    -1e15 - 0.3,
    549755748352,
    NaN,
    Infinity,
    -Infinity
];

describe("doubleToTwoFloats", () => {
    test("all forms split as before, signed zeros included", () => {
        for (let i = 0; i < VALUES.length; i++) {
            const x = VALUES[i],
                y = VALUES[(i + 1) % VALUES.length],
                z = VALUES[(i + 2) % VALUES.length];
            const [hx, lx] = reference(x),
                [hy, ly] = reference(y),
                [hz, lz] = reference(z);

            const high = {},
                low = {};
            doubleToTwoFloatsV3({ x, y, z }, high, low);
            expect([high.x, high.y, high.z, low.x, low.y, low.z]).toEqual([hx, hy, hz, lx, ly, lz]);

            const highArr = new Float32Array(3),
                lowArr = new Float32Array(3);
            doubleToTwoFloat32Array({ x, y, z }, highArr, lowArr);
            expect([...highArr, ...lowArr]).toEqual([hx, hy, hz, lx, ly, lz]);

            expect(doubleToTwoFloats2(x, [0, 0])).toEqual([hx, lx]);
            expect(doubleToTwoFloatsV2(x, { x: 0, y: 0 })).toEqual({ x: hx, y: lx });
        }
    });

    test("high and low add up to the value in float32", () => {
        const high = {},
            low = {};
        doubleToTwoFloatsV3({ x: 6378137.123456789, y: -1234567.875, z: 42.5 }, high, low);
        expect(Math.abs(high.x + low.x - 6378137.123456789)).toBeLessThan(0.004);
        expect(high.y + low.y).toBe(-1234567.875);
        expect(high.z).toBe(0);
        expect(low.z).toBe(42.5);
    });
});
