/**
 * Splits 64-bit values into two 32-bit floats, high and low, for the GPU. No dependencies, so the workers
 * import it without the math classes.
 * @module og/math/doubleToTwoFloats
 */

import type { NumberArray2 } from "./Vec2";
import type { NumberArray3 } from "./Vec3";

type XY = { x: number; y: number };
type XYZ = { x: number; y: number; z: number };

// The value rounded towards zero to a multiple of 65536, it is exact in 32 bits
function getHigh(value: number): number {
    return Math.trunc(value / 65536.0) * 65536.0;
}

/**
 * Separate 64 bit value to two 32-bit float values.
 * @function
 * @param {number} value - Double type value.
 * @param {NumberArray2 | Float32Array} highLowArr - Reference output array.
 * @returns {NumberArray2 | Float32Array} Encoded array. (exactly 2 entries)
 */
export function doubleToTwoFloats2(
    value: number,
    highLowArr: NumberArray2 | Float32Array
): NumberArray2 | Float32Array {
    let h = getHigh(value);
    highLowArr[0] = Math.fround(h);
    highLowArr[1] = Math.fround(value - h);
    return highLowArr;
}

/**
 * Separate 64 bit value to two 32-bit float values.
 * @function
 * @param {number} value - Double type value.
 * @param {Vec2} highLowVec - Reference out vector object.
 * @returns {Vec2} Encoded array. (exactly 2 entries)
 */
export function doubleToTwoFloatsV2<T extends XY>(value: number, highLowVec: T): T {
    let h = getHigh(value);
    highLowVec.x = Math.fround(h);
    highLowVec.y = Math.fround(value - h);
    return highLowVec;
}

/**
 * Splits a 64-bit 3d vector into two vectors with 32-bit float components.
 * @function
 * @param {XYZ} v - Double type value.
 * @param {XYZ} high - Out vector high values.
 * @param {XYZ} low - Out vector low values.
 */
export function doubleToTwoFloatsV3(v: XYZ, high: XYZ, low: XYZ) {
    let x = v.x,
        y = v.y,
        z = v.z;

    let h = getHigh(x);
    high.x = Math.fround(h);
    low.x = Math.fround(x - h);

    h = getHigh(y);
    high.y = Math.fround(h);
    low.y = Math.fround(y - h);

    h = getHigh(z);
    high.z = Math.fround(h);
    low.z = Math.fround(z - h);
}

/**
 * Splits a 64-bit 3d vector into two arrays with 32-bit float components.
 * @function
 * @param {XYZ} v - Double type value.
 * @param {Float32Array | NumberArray3} high - Out high values.
 * @param {Float32Array | NumberArray3} low - Out low values.
 */
export function doubleToTwoFloat32Array(v: XYZ, high: Float32Array | NumberArray3, low: Float32Array | NumberArray3) {
    let x = v.x,
        y = v.y,
        z = v.z;

    let h = getHigh(x);
    high[0] = Math.fround(h);
    low[0] = Math.fround(x - h);

    h = getHigh(y);
    high[1] = Math.fround(h);
    low[1] = Math.fround(y - h);

    h = getHigh(z);
    high[2] = Math.fround(h);
    low[2] = Math.fround(z - h);
}
