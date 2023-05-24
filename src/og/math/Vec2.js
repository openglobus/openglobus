"use strict";

import { Vec3 } from "./Vec3.js";

/**
 * Class represents a 3d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 */
export class Vec2 {
    constructor(x = 0.0, y = 0.0) {
        /**
         * @public
         * @type {number}
         */
        this.x = x || 0.0;

        /**
         * @public
         * @type {number}
         */
        this.y = y || 0.0;
    }
    /** @const */
    static get UP() {
        return new Vec2(0, 1);
    }
    /** @const */
    static get DOWN() {
        return new Vec2(0, -1);
    }
    /** @const */
    static get RIGHT() {
        return new Vec2(1, 0);
    }
    /** @const */
    static get LEFT() {
        return new Vec2(-1, 0);
    }
    /** @const */
    static get ZERO() {
        return new Vec2();
    }

    /**
     * Returns summary vector.
     * @static
     * @param {Vec2} a - First vector.
     * @param {Vec2} b - Second vector.
     * @returns {Vec2} - Summary vector.
     */
    static add(a, b) {
        const res = new Vec2(a.x, a.y);
        res.addA(b);
        return res;
    }

    /**
     * Returns two vectors subtraction.
     * @static
     * @param {Vec2} a - First vector.
     * @param {Vec2} b - Second vector.
     * @returns {Vec2} - Vectors subtraction.
     */
    static sub(a, b) {
        var res = new Vec2(a.x, a.y);
        res.subA(b);
        return res;
    }

    /**
     * Returns scaled vector.
     * @static
     * @param {Vec2} a - Input vector.
     * @param {number} scale - Scale value.
     * @returns {Vec2}
     */
    static scale(a, scale) {
        var res = new Vec2(a.x, a.y);
        res.scale(scale);
        return res;
    }

    /**
     * Returns two vectors production.
     * @static
     * @param {Vec2} a - First vector.
     * @param {Vec2} b - Second vector.
     * @returns {Vec2}
     */
    static mul(a, b) {
        var res = new Vec2(a.x, a.y);
        res.mulA(b);
        return res;
    }

    /**
     * Returns vector components division product one to another.
     * @static
     * @param {Vec2} a - First vector.
     * @param {Vec2} b - Second vector.
     * @returns {Vec2}
     */
    static div(a, b) {
        var res = new Vec2(a.x, a.y);
        res.divA(b);
        return res;
    }

    /**
     * Get projection of the first vector to the second.
     * @static
     * @param {Vec2} b - First vector.
     * @param {Vec2} a - Second vector.
     * @returns {Vec2}
     */
    static proj_b_to_a(b, a) {
        return a.scaleTo(a.dot(b) / a.dot(a));
    }

    /**
     * Gets angle between two vectors.
     * @static
     * @param {Vec2} a - First vector.
     * @param {Vec2} b - Second vector.
     * @returns {number}
     */
    static angle(a, b) {
        return Math.acos(a.dot(b) / Math.sqrt(a.length2() * b.length2()));
    }

    /**
     * Makes vectors normalized and orthogonal to each other.
     * @static
     * @param {Vec2} normal - Normal vector.
     * @param {Vec2} tangent - Tangent vector.
     * @returns {Vec2}
     */
    static orthoNormalize(normal, tangent) {
        normal = normal.norm();
        normal.scale(tangent.dot(normal));
        return tangent.sub(normal).normalize();
    }

    /**
     * Converts to 3d vector, third value is 0.0.
     * @public
     * @returns {Vec3}
     */
    toVector3() {
        return new Vec3(this.x, this.y, 0);
    }

    /**
     * Returns clone vector.
     * @public
     * @returns {Vec2}
     */
    clone() {
        return new Vec2(this.x, this.y);
    }

    /**
     * Compares with vector. Returns true if it equals another.
     * @public
     * @param {Vec2} p - Vector to compare.
     * @returns {boolean}
     */
    equal(p) {
        return this.x === p.x && this.y === p.y;
    }

    /**
     * Copy input vector's values.
     * @param {Vec2} point2 - Vector to copy.
     * @returns {Vec2}
     */
    copy(point2) {
        this.x = point2.x;
        this.y = point2.y;
        return this;
    }

    /**
     * Gets vector's length.
     * @public
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Returns squared vector's length.
     * @public
     * @returns {number}
     */
    length2() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Adds vector to the current.
     * @public
     * @param {Vec2}
     * @returns {Vec2}
     */
    addA(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /**
     * Summarize two vectors.
     * @public
     * @param {Vec2}
     * @returns {Vec2}
     */
    add(v) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    /**
     * Subtract vector from the current where results saved on the current instance.
     * @public
     * @param {Vec2} v - Subtract vector.
     * @returns {Vec2}
     */
    subA(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /**
     * Subtract vector from the current.
     * @public
     * @param {Vec2} v - Subtract vector.
     * @returns {Vec2}
     */
    sub(v) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    /**
     * Scale current vector.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec2}
     */
    scale(scale) {
        this.x *= scale;
        this.y *= scale;
        return this;
    }

    /**
     * Scale current vector to another instance.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec2}
     */
    scaleTo(scale) {
        return new Vec2(this.x * scale, this.y * scale);
    }

    /**
     * Multiply current vector object to another and store result in the current instance.
     * @public
     * @param {Vec2} vec - Multiply vector.
     * @returns {Vec2}
     */
    mulA(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;
    }

    /**
     * Multiply current vector object to another and returns new vector instance.
     * @public
     * @param {Vec2} vec - Multiply vector.
     * @returns {Vec2}
     */
    mul(vec) {
        return new Vec2(this.x * vec.x, this.y * vec.y);
    }

    /**
     * Divide current vector's components to another. Results stores in the current vector object.
     * @public
     * @param {Vec2}
     * @returns {Vec2}
     */
    divA(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        return this;
    }

    /**
     * Gets vectors dot production.
     * @public
     * @param {Vec2} v - Another vector.
     * @returns {number}
     */
    dot(v) {
        return v.x * this.x + v.y * this.y;
    }

    /**
     * Gets vectors dot production.
     * @public
     * @param {Array.<number>} arr - Array vector. (exactly 2 entries)
     * @returns {number}
     */
    dotArr(arr) {
        return arr[0] * this.x + arr[1] * this.y;
    }

    /**
     * Gets vectors cross production.
     * @public
     * @param {Vec2} v - Another vector.
     * @returns {Vec2}
     */
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    /**
     * Sets vector to zero.
     * @public
     * @returns {Vec2}
     */
    clear() {
        this.x = this.y = 0;
        return this;
    }

    /**
     * Returns normalized vector.
     * @public
     * @returns {Vec2}
     */
    normal() {
        var res = new Vec2();
        res.copy(this);

        var length = 1.0 / res.length();

        res.x *= length;
        res.y *= length;

        return res;
    }

    /**
     * Normalize current vector.
     * @public
     * @returns {Vec2}
     */
    normalize() {
        var length = 1.0 / this.length();

        this.x *= length;
        this.y *= length;

        return this;
    }

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number>} - (exactly 2 entries)
     */
    toVec() {
        return [this.x, this.y];
    }

    /**
     * Gets distance to point.
     * @public
     * @param {Vec2} p - Distant point.
     * @returns {number}
     */
    distance(p) {
        var vec = Vec2.sub(this, p);
        return vec.length();
    }

    /**
     * Sets vector's values.
     * @public
     * @param {number} x - Value X.
     * @param {number} y - Value Y.
     * @returns {Vec2}
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * Negate current vector.
     * @public
     * @returns {Vec2}
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Negate current vector to another instance.
     * @public
     * @returns {Vec2}
     */
    negateTo() {
        return new Vec2(-this.x, -this.y);
    }

    /**
     * Gets projected point coordinates of the current vector on the ray.
     * @public
     * @param {Vec2} pos - Ray position.
     * @param {Vec2} direction - Ray direction.
     * @returns {Vec2}
     */
    projToRay(pos, direction) {
        var v = Vec2.proj_b_to_a(Vec2.sub(this, pos), direction);
        v.add(pos);
        return v;
    }

    /**
     * Gets angle between two vectors.
     * @public
     * @param {Vec2} a - Another vector.
     * @returns {number}
     */
    angle(a) {
        return Vec2.angle(this, a);
    }

    /**
     * Returns two vectors linear interpolation.
     * @public
     * @param {Vec2} v2 - End vector.
     * @param {number} l - Interpolate value.
     * @returns {Vec2}
     */
    lerp(v1, v2, l) {
        var res = Vec2.clone(this);
        if (l <= 0.0) {
            res.copy(v1);
        } else if (l >= 1.0) {
            res.copy(v2);
        } else {
            res = Vec2.add(v1, Vec2.sub(v2, v1).scale(l));
        }
        return res;
    }

    static get LERP_DELTA() {
        return 1e-6;
    }

    /**
     * Spherically interpolates between two vectors.
     * Interpolates between current and v2 vector by amount t. The difference between this and linear interpolation (aka, "lerp") is that
     * the vectors are treated as directions rather than points in space. The direction of the returned vector is interpolated
     * by the angle and its magnitude is interpolated between the magnitudes of from and to.
     * @public
     * @param {Vec2} v2 -
     * @param {number} t - The parameter t is clamped to the range [0, 1].
     * @returns {Vec2}
     */
    slerp(v2, t) {
        var res = new Vec2();

        if (t <= 0.0) {
            res.copy(this);
            return;
        } else if (t >= 1.0) {
            res.copy(v2);
            return;
        }

        var omega, sinom, scale0, scale1;
        var cosom = this.dot(v2);

        if (1.0 - cosom > Vec2.LERP_DELTA) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        return Vec2.add(this.scale(scale0), v2.scale(scale1));
    }
}

/**
 * Vector 2d object creator.
 * @function
 * @param {number} [x] - First cvalue.
 * @param {number} [y] - Second value.
 * @returns {Vec2}
 */
export function vec2(x, y) {
    return new Vec2(x, y);
}
