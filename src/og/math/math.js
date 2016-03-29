goog.provide('og.math');

og.math.TWO_PI = 2.0 * Math.PI;
og.math.PI_TWO = Math.PI / 2.0;

og.math.X = 0;
og.math.Y = 1;
og.math.Z = 2;
og.math.W = 3;

og.math.LOG2 = Math.log(2);
og.math.MAX32 = 2147483647;
og.math.MAX = 549755748352;
og.math.MIN = -og.math.MAX;

og.math.RADIANS = Math.PI / 180.0;
og.math.DEGREES = 180.0 / Math.PI;

og.math.DEGREES_DOUBLE = 2.0 * og.math.DEGREES;
og.math.RADIANS_HALF = 0.5 * og.math.RADIANS;

og.math.ARCSECONDS_TO_RADIANS = 0.00000484813681109536;
og.math.RADIANS_TO_HOURS = 3.8197186342054880584532103209403;
og.math.HOURS_TO_RADIANS = 0.26179938779914943653855361527329;
og.math.HOURS_TO_DEGREES = 15.0;
og.math.DEGREES_TO_HOURS = 1.0 / 15.0;

og.math.SQRT_HALF = Math.sqrt(0.5);

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

og.math.log = function (n, base) {
    return Math.log(n) / Math.log(base);
};

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

og.math.norm_lon = function (lon) {
    return Math.asin(Math.sin(lon * og.math.RADIANS_HALF)) * og.math.DEGREES_DOUBLE;
};

og.math.bezier = function (t, p0, p1, p2, p3) {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;

    return p0.scaleTo(uuu).add(p1.scaleTo(3 * uu * t))
        .add(p2.scaleTo(3 * u * tt)).add(p3.scaleTo(ttt));
};

og.math.randomi = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};

og.math.random = function (min, max) {
    return Math.random() * (max - min) + min;
};

og.math.degToDec = function (d, m, s, p) {
    if (p)
        return d + m / 60.0 + s / 3600.0;
    else
        return -d - m / 60.0 - s / 3600.0;
};

/**
 * The modulo operation that also works for negative dividends.
 * @param {Number} m The dividend.
 * @param {Number} n The divisor.
 * @returns {Number} The remainder.
 */
og.math.mod = function (m, n) {
    return ((m % n) + n) % n;
};

/**
 * Returns an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
 * @param {Number} angle in radians
 * @returns {Number}
 */
og.math.zeroTwoPI = function (a) {
    var mod = og.math.mod(a, og.math.TWO_PI);
    if (Math.abs(mod) < og.math.EPSILON14 && Math.abs(a) > og.math.EPSILON14) {
        return og.math.TWO_PI;
    }
    return mod;
};

/**
 * Returns an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
 * @param {Number} angle in radians
 * @returns {Number}
 */
og.math.negativePItoPI = function (a) {
    return og.math.zeroTwoPI(a + Math.PI) - Math.PI;
};

/**
 * Solve using iteration method and a fixed number of steps.
 */
og.math.solve_iteration_fixed = function (f, x0, maxIter) {
    var x = 0;
    var x2 = x0;
    for (var i = 0; i < maxIter; i++) {
        x = x2;
        x2 = f(x);
    }
    return x2;
};

/**
 * Solve using iteration; terminate when error is below err or the maximum
 * number of iterations is reached.
 */
og.math.solve_iteration = function (f, x0, err, maxIter) {
    maxIter = maxIter || 50;
    var x = 0;
    var x2 = x0;
    for (var i = 0; i < maxIter; i++) {
        x = x2;
        x2 = f(x);
        if (Math.abs(x2 - x) < err)
            return x2;
    }
    return x2;
};