goog.provide('og.math');

og.math.GLArray = typeof Float32Array != "undefined" ? Float32Array : typeof WebGLFloatArray != "undefined" ? WebGLFloatArray : Array;

og.math.X = 0;
og.math.Y = 1;
og.math.Z = 2;
og.math.W = 3;

og.math.LOG2 = Math.log(2);

og.math.MAX = 549755748352;
og.math.MIN = -og.math.MAX;

og.math.RADIANS = Math.PI / 180;
og.math.DEGREES = 180 / Math.PI;

//Float round-off PI
Math.PI = 3.1415927410125732;

og.math.EPSILON1 = 0.1;
og.math.EPSILON2 = 0.01;
og.math.EPSILON3 = 0.001;
og.math.EPSILON4 = 0.0001;
og.math.EPSILON5 = 0.00001;
og.math.EPSILON6 = 0.000001;
og.math.EPSILON7 = 1e-7;
og.math.EPSILON8 = 1e-8;
og.math.EPSILON9 = 1e-9;
og.math.EPSILON10 = 1e-10;
og.math.EPSILON11 = 1e-11;
og.math.EPSILON12 = 1e-12;
og.math.EPSILON13 = 1e-13;
og.math.EPSILON14 = 1e-14;
og.math.EPSILON15 = 1e-15;
og.math.EPSILON16 = 1e-16;
og.math.EPSILON17 = 1e-17;
og.math.EPSILON18 = 1e-18;
og.math.EPSILON19 = 1e-19;
og.math.EPSILON20 = 1e-20;

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

og.math.mod = function (x, y) {
    return x - y * Math.floor(x / y);
};

og.math.step = function (edge, x) {
    return x < edge ? 0.0 : 1.0;
};

og.math.frac = function (v) {
    return v - floor(v);
};

og.math.log2 = function (x) {
    return Math.log(x) / og.math.LOG2;
};

og.math.exp2 = function (x) {
    return Math.pow(2, x);
};

og.math.slice = function (t, h1, h0) {
    return t * (h1 - h0);
};

og.math.lerp = function (t, h1, h0) {
    return h0 + t * (h1 - h0);
};