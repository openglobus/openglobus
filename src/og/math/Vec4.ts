"use strict";

import {Vec3} from "./Vec3";

//@ts-ignore
import {frac} from "../math.js";

/**
 * Class represents a 4d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 */
export class Vec4 {

    /**
     * @public
     * @type {number}
     */
    public x: number;

    /**
     * @public
     * @type {number}
     */
    public y: number;

    /**
     * @public
     * @type {number}
     */
    public z: number;

    /**
     * @public
     * @type {number}
     */
    public w: number;


    constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0, w: number = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    /**
     * Identity vector [0,0,0,1].
     * @const
     * @type {Vec4}
     */
    static get identity(): Vec4 {
        return new Vec4(0, 0, 0, 1);
    }

    /**
     * Creates 4d vector from array.
     * @function
     * @param {Array.<number>} arr - Array of four values
     * @returns {Vec4}
     */
    static fromVec(arr: [number, number, number, number]): Vec4 {
        return new Vec4(arr[0], arr[1], arr[2], arr[3]);
    }

    /**
     * Converts to Vec3, without fourth value.
     * @public
     * @returns {Vec3}
     */
    public toVec3(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Returns clone vector.
     * @public
     * @returns {Vec4}
     */
    public clone(): Vec4 {
        return new Vec4(this.x, this.y, this.z, this.w);
    }

    /**
     * Compares with vector. Returns true if it equals another.
     * @public
     * @param {Vec4} v - Vector to compare.
     * @returns {boolean}
     */
    public equal(v: Vec4): boolean {
        return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
    }

    /**
     * Copy input vector's values.
     * @param {Vec4} v - Vector to copy.
     * @returns {Vec4}
     */
    public copy(v: Vec4): Vec4 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    }

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number>} - (exactly 4 entries)
     */
    public toArray(): [number, number, number, number] {
        return [this.x, this.y, this.z, this.w];
    }

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number>} - (exactly 4 entries)
     */
    toArray3(): [number, number, number] {
        return [this.x, this.y, this.z];
    }

    /**
     * Sets vector's values.
     * @public
     * @param {number} x - Value X.
     * @param {number} y - Value Y.
     * @param {number} z - Value Z.
     * @param {number} w - Value W.
     * @returns {Vec4}
     */
    public set(x: number, y: number, z: number, w: number): Vec4 {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Adds vector to the current.
     * @public
     * @param {Vec4} v - Vector to add.
     * @returns {Vec4}
     */
    public addA(v: Vec4): Vec4 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    }

    /**
     * Subtract vector from the current.
     * @public
     * @param {Vec4} v - Subtract vector.
     * @returns {Vec4}
     */
    public subA(v: Vec4): Vec4 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    }

    /**
     * Scale current vector.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec4}
     */
    public scale(scale: number): Vec4 {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        this.w *= scale;
        return this;
    }

    /**
     * Makes vector affinity. Thereby fourth component becomes to 1.0.
     * @public
     * @returns {Vec4}
     */
    public affinity(): Vec4 {

        let iw = 1.0 / this.w;

        this.x *= iw;
        this.y *= iw;
        this.z *= iw;
        this.w = 1.0;

        return this;
    }

    /**
     * Scale current vector to another instance.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec3}
     */
    public scaleTo(scale: number): Vec4 {
        return new Vec4(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
    }

    /**
     * Vector's edge function that returns vector where each component is 0.0 if it's smaller than edge and otherwise 1.0.
     * @public
     * @returns {Vec4}
     */
    public getStep(edge: number): Vec4 {
        return new Vec4(
            this.x < edge ? 0.0 : 1.0,
            this.y < edge ? 0.0 : 1.0,
            this.z < edge ? 0.0 : 1.0,
            this.w < edge ? 0.0 : 1.0
        );
    }

    /**
     * The vector frac function returns the vector of fractional parts of each value, i.e. x minus floor(x).
     * @public
     * @param {Vec4} v - Input vector
     * @returns {Vec4}
     */
    public getFrac(v: Vec4): Vec4 {
        return new Vec4(frac(v.x), frac(v.y), frac(v.z), frac(v.w));
    }

    /**
     * Gets vectors dot production.
     * @public
     * @param {Vec4} v - Another vector.
     * @returns {number} - Dot product.
     */
    public dot(v: Vec4): number {
        return v.x * this.x + v.y * this.y + v.z * this.z + v.w * this.w;
    }

    /**
     * Returns true if vector's values are zero.
     * @public
     * @returns {boolean} -
     */
    public isZero(): boolean {
        return !(this.x || this.y || this.z || this.w);
    }
}

/**
 * Vector 4d object creator.
 * @function
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 * @returns {Vec4}
 */
export function vec4(x: number = 0, y: number = 0, z: number = 0, w: number = 0): Vec4 {
    return new Vec4(x, y, z, w);
}
