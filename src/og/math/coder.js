/**
 * @module og/math/coder
 */

'use strict';

import * as math from '../math.js';
import { Vec4 } from './Vec4.js';

/**
 * Encode 32 bit float value to the RGBA vector.
 * @function
 * @param {number} v - 32 bit float value.
 * @returns {og.math.Vec4} - RGBA vector value.
 */
export function encodeFloatToRGBA(v) {
    var enc = new Vec4(1.0 * v % 1, 255.0 * v % 1, 65025.0 * v % 1, 160581375.0 * v % 1);
    var yzww = new Vec4(enc.y / 255, enc.z / 255, enc.w / 255, 0);
    return enc.subA(yzww);
};

/**
 * Decode RGBA vector to 32 bit float value.
 * @function
 * @param {og.Vec4} rgba - RGBA encoded 32 bit float value.
 * @returns {number} - Float value.
 */
export function decodeFloatFromRGBA(rgba) {
    var s = 1.0 - math.step(128.0, rgba.x) * 2.0;
    var e = 2.0 * math.mod(rgba.x, 128.0) + math.step(128.0, rgba.y) - 127.0;
    var m = math.mod(rgba.y, 128.0) * 65536.0 + rgba.z * 256.0 + rgba.w + 8388608.00;
    return s * math.exp2(e) * (m * 1.1920928955078125e-7);
};

/**
 * Separate 63 bit value to two 32 bit float values.
 * @function
 * @param {number} value - Double type value.
 * @returns {Array.<number,number>} Encoded array.
 */
export function doubleToTwoFloats(value) {
    var high, low;
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
};

/**
 * Separate 63 bit value to two 32 bit float values.
 * @function
 * @param {number} value - Double type value.
 * @returns {Array.<number,number>} Encoded array.
 */
export function doubleToTwoFloats2(value, highLowArr) {
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
};