/**
 * @module og/math/Vec4
 */

'use strict';

import { Vec3 } from './Vec3.js';

/**
 * Class represents a 4d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 */
export class Vec4 {

    constructor(x, y, z, w) {

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

        /**
         * @public
         * @type {number}
         */
        this.z = z || 0.0;

        /**
         * @public
         * @type {number}
         */
        this.w = w || 0.0;
    };

    /**
     * Identity vector [0,0,0,1].
     * @const
     * @type {og.math.Vec4}
     */
    static get identity() { return new Vec4(0, 0, 0, 1); };

    /**
     * Creates 4d vector from array.
     * @function
     * @param {Array.<number,number,number,number>}
     * @returns {og.math.Vec4}
     */
    static fromVec(arr) {
        return new Vec4(arr[0], arr[1], arr[2], arr[3]);
    };

    /**
     * Converts to 3d vector, without fourth value.
     * @public
     * @returns {og.Vec3}
     */
    toVec3() {
        return new Vec3(this.x, this.y, this.z);
    };

    /**
     * Returns clone vector.
     * @public
     * @returns {og.math.Vec4}
     */
    clone(v) {
        return new Vec4(this.x, this.y, this.z, this.w);
    };

    /**
     * Compares with vector. Returns true if it equals another.
     * @public
     * @param {og.math.Vec4} p - Vector to compare.
     * @returns {boolean}
     */
    equal(v) {
        return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
    };

    /**
     * Copy input vector's values.
     * @param {og.math.Vec4} v - Vector to copy.
     * @returns {og.math.Vec4}
     */
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    };

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number,number,number,number>}
     * @deprecated
     */
    toVec() {
        return [this.x, this.y, this.z, this.w];
    };

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number,number,number,number>}
     */
    toArray() {
        return [this.x, this.y, this.z, this.w];
    };

    /**
     * Sets vector's values.
     * @public
     * @param {number} x - Value X.
     * @param {number} y - Value Y.
     * @param {number} z - Value Z.
     * @param {number} w - Value W.
     * @returns {og.math.Vec4}
     */
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    };

    /**
     * Adds vector to the current.
     * @public
     * @param {og.math.Vec4}
     * @returns {og.math.Vec4}
     */
    addA(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    };

    /**
     * Subtract vector from the current.
     * @public
     * @param {og.math.Vec4} v - Subtract vector.
     * @returns {og.math.Vec4}
     */
    subA(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    };

    /**
     * Scale current vector.
     * @public
     * @param {number} scale - Scale value.
     * @returns {og.math.Vec4}
     */
    scale(scale) {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        this.w *= scale;
        return this;
    };

    /**
     * Makes vector affinity. Thereby fourh component becomes to 1.0.
     * @public
     * @returns {og.math.Vec4}
     */
    affinity() {
        var iw = 1 / this.w;
        this.x *= iw;
        this.y *= iw;
        this.z *= iw;
        this.w = 1.0;
        return this;
    };

    /**
     * Scale current vector to another instance.
     * @public
     * @param {number} scale - Scale value.
     * @returns {og.Vec3}
     */
    scaleTo(scale) {
        return new Vec4(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
    };

    /**
     * Vector's edge function that returns vector where each component is 0.0 if it's smaller then edge and otherwise 1.0.
     * @public
     * @returns {og.math.Vec4}
     */
    getStep(edge) {
        return new Vec4(
            this.x < edge ? 0.0 : 1.0,
            this.y < edge ? 0.0 : 1.0,
            this.z < edge ? 0.0 : 1.0,
            this.w < edge ? 0.0 : 1.0
        );
    };

    /**
     * The vector fract function returns the vector of fractional parts of each value, i.e. x minus floor(x).
     * @public
     * @returns {og.math.Vec4}
     */
    getFrac(v) {
        return new Vec4(
            og.math.frac(v.x),
            og.math.frac(v.y),
            og.math.frac(v.z),
            og.math.frac(v.w)
        );
    };

    /**
     * Gets vectors dot production.
     * @public
     * @param {og.math.Vec4} v - Another vector.
     * @returns {number} - Dot product.
     */
    dot(v) {
        return v.x * this.x + v.y * this.y + v.z * this.z + v.w * this.w;
    };

    /**
     * Returns true if vector's values are zero.
     * @public
     * @returns {boolean} -
     */
    isZero() {
        return !(this.x || this.y || this.z || this.w);
    };
}

/**
 * Vector 4d object creator.
 * @function
 * @param {number} [x] - First cvalue.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 * @returns {og.math.Vec4}
 */
export function vec4(x, y, z, w) {
    return new og.math.Vec4(x, y, z, w);
};
