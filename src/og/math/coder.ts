/**
 * @module og/math/coder
 */

import * as math from "../math";
import {NumberArray4, Vec4} from "./Vec4";
import {NumberArray3} from "./Vec3";
import {NumberArray2, Vec2} from "./Vec2";

/**
 * Encode 32 bit float value to the RGBA vector.
 * @function
 * @param {number} v - 32 bit float value.
 * @returns {Vec4} - RGBA vector value.
 */
export function encodeFloatToRGBA(v: number): Vec4 {
    let enc = new Vec4((1.0 * v) % 1, (255.0 * v) % 1, (65025.0 * v) % 1, (160581375.0 * v) % 1);
    let yzww = new Vec4(enc.y / 255, enc.z / 255, enc.w / 255, 0);
    return enc.subA(yzww);
}

/**
 * Decode RGBA vector to 32 bit float value.
 * @function
 * @param {Vec4} rgba - RGBA encoded 32 bit float value.
 * @returns {number} - Float value.
 */
export function decodeFloatFromRGBA(rgba: Vec4): number {
    let s = 1.0 - math.step(128.0, rgba.x) * 2.0;
    let e = 2.0 * math.mod(rgba.x, 128.0) + math.step(128.0, rgba.y) - 127.0;
    let m = math.mod(rgba.y, 128.0) * 65536.0 + rgba.z * 256.0 + rgba.w + 8388608.0;
    return s * math.exp2(e) * (m * 1.1920928955078125e-7);
}

/**
 * Decode RGBA vector to 32 bit float value.
 * @function
 * @param {NumberArray4 | NumberArray3} arr - RGBA encoded 32 bit float value.
 * @param {boolean} [use32=false] Use 32 bit result
 * @returns {number} - Float value.
 */
export function decodeFloatFromRGBAArr(arr: NumberArray4 | NumberArray3, use32: boolean = false): number {
    let s = 1.0 - math.step(128.0, arr[0]) * 2.0;
    let e = 2.0 * math.mod(arr[0], 128.0) + math.step(128.0, arr[1]) - 127.0;
    let m = math.mod(arr[1], 128.0) * 65536.0 + arr[2] * 256.0 + (use32 ? arr[3] || 0.0 : 0.0) + 8388608.0;
    return s * math.exp2(e) * (m * 1.1920928955078125e-7);
}

/**
 * Separate 64 bit value to two 32-bit float values.
 * @function
 * @param {number} value - Double type value.
 * @returns {Float32Array} Encoded array. (exactly 2 entries)
 */
export function doubleToTwoFloats(value: number): Float32Array {
    let high: number, low: number;
    if (value >= 0.0) {
        let doubleHigh = Math.floor(value / 65536.0) * 65536.0;
        high = Math.fround(doubleHigh);
        low = Math.fround(value - doubleHigh);
    } else {
        let doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
        high = Math.fround(-doubleHigh);
        low = Math.fround(value + doubleHigh);
    }
    return new Float32Array([high, low]);
}

/**
 * Separate 64 bit value to two 32-bit float values.
 * @function
 * @param {number} value - Double type value.
 * @param {NumberArray2 | Float32Array} - Reference out array.
 * @returns {NumberArray2 | Float32Array} Encoded array. (exactly 2 entries)
 */
export function doubleToTwoFloats2(value: number, highLowArr: NumberArray2 | Float32Array): NumberArray2 | Float32Array {
    if (value >= 0.0) {
        let doubleHigh = Math.floor(value / 65536.0) * 65536.0;
        highLowArr[0] = Math.fround(doubleHigh);
        highLowArr[1] = Math.fround(value - doubleHigh);
    } else {
        let doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
        highLowArr[0] = Math.fround(-doubleHigh);
        highLowArr[1] = Math.fround(value + doubleHigh);
    }
    return highLowArr;
}

/**
 * Separate 64 bit value to two 32-bit float values.
 * @function
 * @param {number} value - Double type value.
 * @param {Vec2} highLowVec - Reference out vector object.
 * @returns {Vec2} Encoded array. (exactly 2 entries)
 */
export function doubleToTwoFloatsV2(value: number, highLowVec: Vec2): Vec2 {
    if (value >= 0.0) {
        let doubleHigh = Math.floor(value / 65536.0) * 65536.0;
        highLowVec.x = Math.fround(doubleHigh);
        highLowVec.y = Math.fround(value - doubleHigh);
    } else {
        let doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
        highLowVec.x = Math.fround(-doubleHigh);
        highLowVec.y = Math.fround(value + doubleHigh);
    }
    return highLowVec;
}
