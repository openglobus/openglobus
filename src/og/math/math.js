goog.provide('og.math');

/** @const */
og.math.TWO_PI = 2.0 * Math.PI;

/** @const */
og.math.PI_TWO = Math.PI / 2.0;

og.math.X = 0;
og.math.Y = 1;
og.math.Z = 2;
og.math.W = 3;

/** @const */
og.math.LOG2 = Math.log(2);
/** @const */
og.math.MAX32 = 2147483647;
/** @const */
og.math.MAX = 549755748352;
/** @const */
og.math.MIN = -og.math.MAX;

/** @const */
og.math.RADIANS = Math.PI / 180.0;
/** @const */
og.math.DEGREES = 180.0 / Math.PI;

/** @const */
og.math.DEGREES_DOUBLE = 2.0 * og.math.DEGREES;
/** @const */
og.math.RADIANS_HALF = 0.5 * og.math.RADIANS;

/** @const */
og.math.ARCSECONDS_TO_RADIANS = 0.00000484813681109536;
/** @const */
og.math.RADIANS_TO_HOURS = 3.8197186342054880584532103209403;
/** @const */
og.math.HOURS_TO_RADIANS = 0.26179938779914943653855361527329;
/** @const */
og.math.HOURS_TO_DEGREES = 15.0;
/** @const */
og.math.DEGREES_TO_HOURS = 1.0 / 15.0;

/** @const */
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

/** 
 * The log function returns the power to which the base value has to be raised to produce n.
 * @function
 * @param {number} n - Produce value.
 * @param {number} base - Base value.
 * @returns {number}
 * @example
 * og.math.log(64,2)
 * //returns 6
 */
og.math.log = function (n, base) {
    return Math.log(n) / Math.log(base);
};

/**
 * Clamp the number.
 * @function
 * @param {number} number - Input number.
 * @param {number} min - Minimal edge.
 * @param {number} max - Maximal edge.
 * @returns {number}
 * @example
 * og.math.clamp(12,1,5)
 * //returns 5
 */
og.math.clamp = function (number, min, max) {
    return Math.max(min, Math.min(number, max));
};

/**
 * Converts degrees value to radians.
 * @function
 * @param {number} degrees - Degree value.
 * @returns {number}
 */
og.math.DEG2RAD = function (degrees) {
    return degrees * og.math.RADIANS;
};

/**
 * Converts radians value to degrees.
 * @function
 * @param {number} angle - Degree value.
 * @returns {number}
 */
og.math.RAD2DEG = function (angle) {
    return angle * og.math.DEGREES;
};

/**
 * Check the number is a power of two.
 * @function
 * @param {number} x - Value.
 * @returns {boolean}
 */
og.math.isPowerOfTwo = function (x) {
    return (x & (x - 1)) == 0;
};

/**
 * Returns next value that is power of two.
 * @function
 * @param {number} x - Value.
 * @returns {number}
 */
 og.math.nextHighestPowerOfTwo = function (x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
};

/**
 * Returns random integer number within the bounds.
 * @function
 * @param {number} min - Minimal bound.
 * @param {number} max - Maximal bound.
 * @returns {number}
 */
og.math.randomi = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};

/**
 * Returns random number within the bounds.
 * @function
 * @param {number} min - Minimal bound.
 * @param {number} max - Maximal bound.
 * @returns {number}
 */
og.math.random = function (min, max) {
    return Math.random() * (max - min) + min;
};

/**
 * Converts degrees value to decimal.
 * @function
 * @param {number} d - Degrees.
 * @param {number} m - Minutes.
 * @param {number} s - Seconds.
 * @param {boolean} [p] - Positive flag. False - default.
 */
og.math.degToDec = function (d, m, s, p) {
    if (p)
        return d + m / 60.0 + s / 3600.0;
    else
        return -d - m / 60.0 - s / 3600.0;
};

/**
 * The modulo operation that also works for negative dividends.
 * @function
 * @param {number} m - The dividend.
 * @param {number} n - The divisor.
 * @returns {number} The remainder.
 */
og.math.mod = function (m, n) {
    return ((m % n) + n) % n;
};

/**
 * Returns an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
 * @function
 * @param {number} a - Angle in radians
 * @returns {number}
 */
og.math.zeroTwoPI = function (a) {
    var mod = og.math.mod(a, og.math.TWO_PI);
    if (Math.abs(mod) < og.math.EPSILON14 && Math.abs(a) > og.math.EPSILON14) {
        return og.math.TWO_PI;
    }
    return mod;
};

/**
 * Returns 0.0 if x is smaller then edge and otherwise 1.0.
 * @function
 * @param {number} edge - Edge.
 * @param {number} x - Value to edge.
 * @returns {number}
 */
og.math.step = function (edge, x) {
    return x < edge ? 0.0 : 1.0;
};

/** 
 * The fract function returns the fractional part of x, i.e. x minus floor(x).
 * @function
 * @param {number} x - Input value.
 * @returns {number}
 */
og.math.frac = function (x) {
    return x - Math.floor(x);
};

/**
 * Returns Math.log(x) / Math.log(2)
 * @function
 * @param {number} x
 * @returns {number}
 */
og.math.log2 = function (x) {
    return Math.log(x) / og.math.LOG2;
};

/**
 * Returns two power of x.
 * @function
 * @param {number} x - Power value.
 * @returns {number}
 */
og.math.exp2 = function (x) {
    return Math.pow(2, x);
};

/**
 * Returns a slice of linear interpolation t * (h1 - h0)
 * @param {number} t
 * @param {number} h1
 * @param {number} h0
 * @returns
 */
og.math.slice = function (t, h1, h0) {
    return t * (h1 - h0);
};

/**
 * Performs a linear interpolation.
 * @function
 * @param {number} t - A value that linearly interpolates between the x parameter and the y parameter.
 * @param {number} h1 - The first value.
 * @param {number} h1 - The second value.
 * @returns {number}
 */
og.math.lerp = function (t, h1, h0) {
    return h0 + t * (h1 - h0);
};

/**
 * Performs a 3D bezier interpolation.
 * @function
 * @param {number} t
 * @param {og.math.Vector3} p0 - First control point.
 * @param {og.math.Vector3} p1 - Second control point.
 * @param {og.math.Vector3} p2 - Third control point.
 * @param {og.math.Vector3} p3 - Fourth control point.
 * @returns {og.math.Vector3}
 */
og.math.bezier = function (t, p0, p1, p2, p3) {
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;

    return p0.scaleTo(uuu).addA(p1.scaleTo(3 * uu * t))
        .addA(p2.scaleTo(3 * u * tt)).addA(p3.scaleTo(ttt));
};

/**
 * Clamp angle value within 360.
 * @function
 * @param {number} x - Input angle.
 * @returns {number}
 */
og.math.rev = function (x) {
    return x - Math.floor(x / 360.0) * 360.0;
};

/**
 * Clamp longitude within: -180 to +180 degrees.
 * @function
 * @param {number} lon - Longitude.
 * @returns {number}
 */
og.math.norm_lon = function (lon) {
    return Math.asin(Math.sin(lon * og.math.RADIANS_HALF)) * og.math.DEGREES_DOUBLE;
};

/**
 * Returns an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
 * @function
 * @param {number} a - Angle in radians
 * @returns {number}
 */
og.math.negativePItoPI = function (a) {
    return og.math.zeroTwoPI(a + Math.PI) - Math.PI;
};

/**
 * Solve using iteration method and a fixed number of steps.
 * @function
 * @param {equationCallback} f - Equation. Used in Euler's equation(see og.orbit) solving.
 * @param {number} x0 - First approximation.
 * @param {number} maxIter - Maximum iterations.
 * @returns {number}
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
 * number of iterations is reached. Used in Euler's equation(see og.orbit) solving.
 * @function
 * @param {equationCallback} f - Equation.
 * @param {number} x0 - First approximation.
 * @param {number} err - Maximal accepted error value.
 * @param {number} maxIter - Maximum iterations.
 * @returns {number}
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

/**
 * Equation function.
 * @callback equationCallback
 * @param {number} x - Equation variable.
 */