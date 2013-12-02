goog.provide('og.math');

og.math.GLArray = typeof Float32Array != "undefined" ? Float32Array : typeof WebGLFloatArray != "undefined" ? WebGLFloatArray : Array;

og.math.X = 0;
og.math.Y = 1;
og.math.Z = 2;
og.math.W = 3;

og.math.MAX = 100000000;
og.math.MIN = -100000000;

og.math.RADIANS = Math.PI / 180;
og.math.DEGREES = 180 / Math.PI;

//Float round-off PI
Math.PI = 3.1415927410125732;

og.math.clamp = function (number, min, max) {
    return Math.max(min, Math.min(number, max));
};

og.math.DEG2RAD = function (degrees) {
    return degrees * og.math.RADIANS;
};

og.math.RAD2DEG = function (angle) {
    return angle * og.math.DEGREES;
};

og.math.isPowerOfTwo = function (x) {
    return (x & (x - 1)) == 0;
};

og.math.nextHighestPowerOfTwo = function (x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
};