goog.provide('og.math.coder');

goog.require('og.math');
goog.require('og.math.Vector4');

/**
 * Encode 32 bit float value to the RGBA vector.
 * @function
 * @param {nummer} f - 32 bit float value.
 * @returns {og.math.Vector4}
 */
og.math.coder.encodeFloatToRGBA = function (v) {
    var enc = vec4 ( 1.0, 255.0, 65025.0, 160581375.0) * v;	
    enc  = og.math.frac ( enc );
    enc -= enc.yzww * vec4 (1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0 );	
    return enc;
};

/**
 * Decode RGBA vector to 32 bit float value.
 * @function
 * @param {og.math.Vector4} rgba - RGBA encoded 32 bit float value.
 * @returns {number}
 */
og.math.coder.decodeFloatFromRGBA = function (rgba) {
    var s = 1.0 - og.math.step(128.0, rgba.x) * 2.0;
    var e = 2.0 * og.math.mod(rgba.x, 128.0) + og.math.step(128.0, rgba.y) - 127.0;
    var m = og.math.mod(rgba.y, 128.0) * 65536.0 + rgba.z * 256.0 + rgba.w + 8388608.00;
    return s * og.math.exp2(e) * (m * 1.1920928955078125e-7);
};

/**
 * Separate 63 bit value to two 32 bit float values.
 * @function
 * @param {number} value - Double type value.
 * @returns {Array.<number,number>}
 */
og.math.coder.doubleToTwoFloats = function (value) {
    var high, low;
    if (value >= 0.0) {
        var doubleHigh = Math.floor(value / 65536.0) * 65536.0;
        high = Math.fround(doubleHigh);
        low = Math.fround(value - doubleHigh);
    } else {
        var doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
        high = Math.fround(-doubleHigh);
        low = Math.fround(value + doubleHigh);
    }
    return [high, low];
};