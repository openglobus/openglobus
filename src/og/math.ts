"use strict";

import {Vec3} from "./math/Vec3";

/** @const */
export const TWO_PI = 2.0 * Math.PI;

/** @const */
export const PI_TWO = Math.PI / 2.0;

export const X = 0;
export const Y = 1;
export const Z = 2;
export const W = 3;

export const MAX_FLOAT = Number.MAX_VALUE || 1.7976931348623157e308;

/** @const */
export const LOG2 = Math.log(2);
/** @const */
export const MAX32 = 2147483647;
/** @const */
export const MAX = 549755748352;
/** @const */
export const MIN = -MAX;

/** @const */
export const RADIANS = Math.PI / 180.0;
/** @const */
export const DEGREES = 180.0 / Math.PI;

/** @const */
export const DEGREES_DOUBLE = 2.0 * DEGREES;
/** @const */
export const RADIANS_HALF = 0.5 * RADIANS;

/** @const */
export const ARCSECONDS_TO_RADIANS = 0.00000484813681109536;
/** @const */
export const RADIANS_TO_HOURS = 3.8197186342054880584532103209403;
/** @const */
export const HOURS_TO_RADIANS = 0.26179938779914943653855361527329;
/** @const */
export const HOURS_TO_DEGREES = 15.0;
/** @const */
export const DEGREES_TO_HOURS = 1.0 / 15.0;

/** @const */
export const SQRT_HALF = Math.sqrt(0.5);

export const EPS1 = 1e-1;
export const EPS2 = 1e-2;
export const EPS3 = 1e-3;
export const EPS4 = 1e-4;
export const EPS5 = 1e-5;
export const EPS6 = 1e-6;
export const EPS7 = 1e-7;
export const EPS8 = 1e-8;
export const EPS9 = 1e-9;
export const EPS10 = 1e-10;
export const EPS11 = 1e-11;
export const EPS12 = 1e-12;
export const EPS13 = 1e-13;
export const EPS14 = 1e-14;
export const EPS15 = 1e-15;
export const EPS16 = 1e-16;
export const EPS17 = 1e-17;
export const EPS18 = 1e-18;
export const EPS19 = 1e-19;
export const EPS20 = 1e-20;

/**
 * The log function returns the power to which the base value has to be raised to produce n.
 * @function
 * @param {number} n - Produce value.
 * @param {number} base - Base value.
 * @returns {number} -
 * @example
 * log(64, 2)
 * //returns 6
 */
export function log(n: number, base: number): number {
    return Math.log(n) / Math.log(base);
}

/**
 * Clamp the number.
 * @function
 * @param {number} number - Input number.
 * @param {number} min - Minimal edge.
 * @param {number} max - Maximal edge.
 * @returns {number} -
 * @example
 * clamp(12, 1, 5)
 * //returns 5
 */
export function clamp(number: number, min: number, max: number): number {
    return Math.max(min, Math.min(number, max));
}

/**
 * Converts degrees value to radians.
 * @function
 * @param {number} degrees - Degree value.
 * @returns {number} -
 */
export function DEG2RAD(degrees: number): number {
    return degrees * RADIANS;
}

/**
 * Converts radians value to degrees.
 * @function
 * @param {number} angle - Degree value.
 * @returns {number} -
 */
export function RAD2DEG(angle: number): number {
    return angle * DEGREES;
}

/**
 * Check the number is a power of two.
 * @function
 * @param {number} x - Input value.
 * @returns {boolean} -
 */
export function isPowerOfTwo(x: number): boolean {
    return (x & (x - 1)) === 0;
}

/**
 * Returns next value that is power of two.
 * @function
 * @param {number} x - Input value.
 * @param {number} [maxValue=4096] - Maximal value.
 * @returns {number} -
 */
export function nextHighestPowerOfTwo(x: number, maxValue: number = 4096): number {
    --x;
    for (let i = 1; i < 32; i <<= 1) {
        x = x | (x >> i);
    }
    return (x + 1) > maxValue ? maxValue : x + 1
}

/**
 * Returns random integer number within the bounds.
 * @function
 * @param {number} min - Minimal bound.
 * @param {number} max - Maximal bound.
 * @returns {number} -
 */
export function randomi(min: number = 0, max: number = 1): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Returns random number within the bounds.
 * @function
 * @param {number} [min=0] - Minimal bound.
 * @param {number} [max=1] - Maximal bound.
 * @returns {number} -
 */
export function random(min: number = 0, max: number = 1): number {
    return Math.random() * (max - min) + min;
}

/**
 * Converts degrees value to decimal.
 * @function
 * @param {number} d - Degrees.
 * @param {number} m - Minutes.
 * @param {number} s - Seconds.
 * @param {boolean} [p] - Positive flag. False - default.
 * @returns {number} -
 **/
export function degToDec(d: number, m: number, s: number, p: number): number {
    if (p) {
        return d + m / 60.0 + s / 3600.0;
    } else {
        return -d - m / 60.0 - s / 3600.0;
    }
}

/**
 * The modulo operation that also works for negative dividends.
 * @function
 * @param {number} m - The dividend.
 * @param {number} n - The divisor.
 * @returns {number} The remainder.
 */
export function mod(m: number, n: number): number {
    return ((m % n) + n) % n;
}

/**
 * Returns an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
 * @function
 * @param {number} a - Angle in radians
 * @returns {number} -
 */
export function zeroTwoPI(a: number): number {
    const res = mod(a, TWO_PI);
    if (Math.abs(res) < EPS14 && Math.abs(a) > EPS14) {
        return TWO_PI;
    }
    return res;
}

/**
 * Returns 0.0 if x is smaller than edge and otherwise 1.0.
 * @function
 * @param {number} edge -
 * @param {number} x - Value to edge.
 * @returns {number} -
 */
export function step(edge: number, x: number): number {
    return x < edge ? 0.0 : 1.0;
}

/**
 * The frac function returns the fractional part of x, i.e. x minus floor(x).
 * @function
 * @param {number} x - Input value.
 * @returns {number} -
 */
export function frac(x: number): number {
    const mx = Math.abs(x)
    return mx - Math.floor(mx);
}

/**
 * Returns Math.log(x) / Math.log(2)
 * @function
 * @param {number} x - Input value.
 * @returns {number} -
 */
export function log2(x: number): number {
    return Math.log(x) / LOG2;
}

/**
 * Returns two power of n.
 * @function
 * @param {number} n - Power value.
 * @returns {number} -
 */
export function exp2(n: number): number {
    return Math.pow(2, n);
}

/**
 * Returns two power of integer n.
 * @function
 * @param {number} n - Integer power value.
 * @returns {number} -
 */
export function pow2i(n: number): number {
    return 2 << (n - 1);
}

/**
 * Returns a slice of linear interpolation t * (h1 - h0)
 * @param {number} t - A value that linearly interpolates between the h0 parameter and the h1 parameter.
 * @param {number} h1 - End value.
 * @param {number} h0 - Start value.
 * @returns {number} -
 */
export function slice(t: number, h1: number, h0: number): number {
    return t * (h1 - h0);
}

/**
 * Performs a linear interpolation.
 * @function
 * @param {number} t - A value that linearly interpolates between the h0 parameter and the h1 parameter.
 * @param {number} h1 - End value.
 * @param {number} h0 - Start value.
 * @returns {number} -
 */
export function lerp(t: number, h1: number, h0: number): number {
    return h0 + t * (h1 - h0);
}

export function cube(f: number): number {
    return f * f * f;
}

export function square(f: number): number {
    return f * f;
}

export function bezier1v(t: number, p0: number, p1: number, p2: number, p3: number): number {
    return (
        cube(1 - t) * p0 + 3 * square(1 - t) * t * p1 + 3 * (1 - t) * square(t) * p2 + cube(t) * p3
    );
}

/**
 * Performs a 3D bezier interpolation.
 * @function
 * @param {number} t - Interpolation value.
 * @param {Vec3} p0 - First control point.
 * @param {Vec3} p1 - Second control point.
 * @param {Vec3} p2 - Third control point.
 * @param {Vec3} p3 - Fourth control point.
 * @returns {Vec3} -
 */
export function bezier3v(t: number, p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {

    let u = 1 - t;
    let tt = t * t;
    let uu = u * u;
    let uuu = uu * u;
    let ttt = tt * t;

    return p0.scaleTo(uuu)
        .addA(p1.scaleTo(3 * uu * t))
        .addA(p2.scaleTo(3 * u * tt))
        .addA(p3.scaleTo(ttt));
}

/**
 * Clamp angle value within 360.
 * @function
 * @param {number} x - Input angle.
 * @returns {number} -
 */
export function rev(x: number): number {
    return x - Math.floor(x / 360.0) * 360.0;
}

/**
 * Clamp longitude within: -180 to +180 degrees.
 * @function
 * @param {number} lon - Longitude.
 * @returns {number} -
 */
export function norm_lon(lon: number): number {
    return lon > 180 ? ((lon + 180) % 360) - 180 : lon < -180 ? ((lon - 180) % 360) + 180 : lon;
}

/**
 * Returns an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
 * @function
 * @param {number} a - Angle in radians.
 * @returns {number} -
 */
export function negativePItoPI(a: number): number {
    return zeroTwoPI(a + Math.PI) - Math.PI;
}

/**
 * Solve using iteration method and a fixed number of steps.
 * @function
 * @param {Function} f - Equation. Used in Euler's equation(see og.orbit) solving.
 * @param {number} x0 - First approximation.
 * @param {number} maxIter - Maximum iterations.
 * @returns {number} -
 */
export function solve_iteration_fixed(f: Function, x0: number, maxIter: number): number {
    let x = 0;
    let x2 = x0;
    for (let i = 0; i < maxIter; i++) {
        x = x2;
        x2 = f(x);
    }
    return x2;
}

/**
 * Solve using iteration; terminate when error is below err or the maximum
 * number of iterations is reached. Used in Euler's equation(see og.orbit) solving.
 * @function
 * @param {Function} f - Equation.
 * @param {number} x0 - First approximation.
 * @param {number} err - Maximal accepted error value.
 * @param {number} maxIter - Maximum iterations.
 * @returns {number} -
 */
export function solve_iteration(f: Function, x0: number, err: number, maxIter: number = 50): number {
    let x = 0;
    let x2 = x0;
    for (let i = 0; i < maxIter; i++) {
        x = x2;
        x2 = f(x);
        if (Math.abs(x2 - x) < err) {
            return x2;
        }
    }
    return x2;
}

/**
 * Equation function.
 * @callback equationCallback
 * @param {number} x - Equation variable.
 */

/**
 *
 * @param a - First bearing angle
 * @param b - Second bearing angle
 * @returns {number}
 */
function getAngleDirection(a: number, b: number): number {
    let a_y = Math.cos(a),
        a_x = Math.sin(a),
        b_y = Math.cos(b),
        b_x = Math.sin(b);
    let c = a_y * b_x - b_y * a_x,
        d = a_x * b_x + a_y * b_y;
    if (c > 0.0) {
        return Math.acos(d);
    }
    return -Math.acos(d);
}

/**
 * Returns angle between two azimuths
 * @param {number} a - First azimuth angle
 * @param {number} b - Second azimuth angle
 * @returns {number}
 */
export function getAngleBetweenAzimuths(a: number, b: number): number {
    a = zeroTwoPI(a);
    b = zeroTwoPI(b);
    return ((((a - b) % 360) + 360 + 180) % 360) - 180;
}