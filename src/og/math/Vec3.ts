"use strict";

import {Quat} from "./Quat";
import {Vec4, NumberArray4} from "./Vec4";

export type NumberArray3 = [number, number, number] | Uint8Array;

/**
 * Class represents a 3d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 */
export class Vec3 {

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

    constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /** @const */
    static get UP(): Vec3 {
        return new Vec3(0, 1, 0);
    }

    /** @const */
    static get DOWN(): Vec3 {
        return new Vec3(0, -1, 0);
    }

    /** @const */
    static get RIGHT(): Vec3 {
        return new Vec3(1, 0, 0);
    }

    /** @const */
    static get LEFT(): Vec3 {
        return new Vec3(-1, 0, 0);
    }

    /** @const */
    static get FORWARD(): Vec3 {
        return new Vec3(0, 0, -1);
    }

    /** @const */
    static get BACKWARD(): Vec3 {
        return new Vec3(0, 0, 1);
    }

    /** @const */
    static get ZERO(): Vec3 {
        return new Vec3();
    }

    /** @const */
    static get UNIT_X(): Vec3 {
        return new Vec3(1, 0, 0);
    }

    /** @const */
    static get UNIT_Y(): Vec3 {
        return new Vec3(0, 1, 0);
    }

    /** @const */
    static get UNIT_Z(): Vec3 {
        return new Vec3(0, 0, 1);
    }

    /** @const */
    static get NORTH(): Vec3 {
        return Vec3.UNIT_Z;
    }

    /**
     * Separate 63 bit Vec3 to two Vec3 32-bit float values.
     * @function
     * @param {Vec3} v - Double type value.
     * @param {Vec3} high - Out vector high values.
     * @param {Vec3} low - Out vector low values.
     */
    static doubleToTwoFloats(v: Vec3, high: Vec3, low: Vec3) {
        let x = v.x,
            y = v.y,
            z = v.z;

        if (x >= 0.0) {
            let doubleHigh = Math.floor(x / 65536.0) * 65536.0;
            high.x = Math.fround(doubleHigh);
            low.x = Math.fround(x - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-x / 65536.0) * 65536.0;
            high.x = Math.fround(-doubleHigh);
            low.x = Math.fround(x + doubleHigh);
        }

        if (y >= 0.0) {
            let doubleHigh = Math.floor(y / 65536.0) * 65536.0;
            high.y = Math.fround(doubleHigh);
            low.y = Math.fround(y - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-y / 65536.0) * 65536.0;
            high.y = Math.fround(-doubleHigh);
            low.y = Math.fround(y + doubleHigh);
        }

        if (z >= 0.0) {
            let doubleHigh = Math.floor(z / 65536.0) * 65536.0;
            high.z = Math.fround(doubleHigh);
            low.z = Math.fround(z - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-z / 65536.0) * 65536.0;
            high.z = Math.fround(-doubleHigh);
            low.z = Math.fround(z + doubleHigh);
        }
    }

    /**
     * Separate 63 bit Vec3 to two Vec3 32-bit float values.
     * @function
     * @param {Vec3} v - Double type value.
     * @param {Float32Array} high - Out vector high values.
     * @param {Float32Array} low - Out vector low values.
     * @returns {Array.<number>} Encoded array. (exactly 2 entries)
     */
    static doubleToTwoFloat32Array(v: Vec3, high: Float32Array | NumberArray3, low: Float32Array | NumberArray3) {
        let x = v.x,
            y = v.y,
            z = v.z;

        if (x >= 0.0) {
            let doubleHigh = Math.floor(x / 65536.0) * 65536.0;
            high[0] = Math.fround(doubleHigh);
            low[0] = Math.fround(x - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-x / 65536.0) * 65536.0;
            high[0] = Math.fround(-doubleHigh);
            low[0] = Math.fround(x + doubleHigh);
        }

        if (y >= 0.0) {
            let doubleHigh = Math.floor(y / 65536.0) * 65536.0;
            high[1] = Math.fround(doubleHigh);
            low[1] = Math.fround(y - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-y / 65536.0) * 65536.0;
            high[1] = Math.fround(-doubleHigh);
            low[1] = Math.fround(y + doubleHigh);
        }

        if (z >= 0.0) {
            let doubleHigh = Math.floor(z / 65536.0) * 65536.0;
            high[2] = Math.fround(doubleHigh);
            low[2] = Math.fround(z - doubleHigh);
        } else {
            let doubleHigh = Math.floor(-z / 65536.0) * 65536.0;
            high[2] = Math.fround(-doubleHigh);
            low[2] = Math.fround(z + doubleHigh);
        }
    }

    /**
     * Creates 3d vector from array.
     * @function
     * @param {NumberArray3|NumberArray4} arr - Input array (exactly 3 entries)
     * @returns {Vec3} -
     */
    static fromVec(arr: NumberArray3 | NumberArray4): Vec3 {
        return new Vec3(arr[0], arr[1], arr[2]);
    }

    /**
     * Gets angle between two vectors.
     * @static
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {number} -
     */
    static angle(a: Vec3, b: Vec3): number {
        return Math.acos(a.dot(b) / Math.sqrt(a.length2() * b.length2()));
    }

    /**
     * Returns two vectors linear interpolation.
     * @static
     * @param {Vec3} v1 - Start vector.
     * @param {Vec3} v2 - End vector.
     * @param {number} l - Interpolate value.
     * @returns {Vec3} -
     */
    static lerp(v1: Vec3, v2: Vec3, l: number) {
        return new Vec3(v1.x + (v2.x - v1.x) * l, v1.y + (v2.y - v1.y) * l, v1.z + (v2.z - v1.z) * l);
    }

    /**
     * Returns summary vector.
     * @static
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Vec3} - Summary vector.
     */
    static add(a: Vec3, b: Vec3): Vec3 {
        let res = new Vec3(a.x, a.y, a.z);
        res.addA(b);
        return res;
    }

    /**
     * Returns two vectors subtraction.
     * @static
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Vec3} - Vectors subtraction.
     */
    static sub(a: Vec3, b: Vec3): Vec3 {
        let res = new Vec3(a.x, a.y, a.z);
        res.subA(b);
        return res;
    }

    /**
     * Returns scaled vector.
     * @static
     * @param {Vec3} a - Input vector.
     * @param {number} scale - Scale value.
     * @returns {Vec3} -
     */
    static scale(a: Vec3, scale: number): Vec3 {
        return a.scaleTo(scale);
    }

    /**
     * Returns two vectors production.
     * @static
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Vec3} -
     */
    static mul(a: Vec3, b: Vec3): Vec3 {
        let res = new Vec3(a.x, a.y, a.z);
        res.mulA(b);
        return res;
    }

    /**
     * Returns true if two vectors are non-collinear.
     * @public
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Vec3} -
     */
    static noncollinear(a: Vec3, b: Vec3): boolean {
        return Boolean(a.y * b.z - a.z * b.y || a.z * b.x - a.x * b.z || a.x * b.y - a.y * b.z);
    }

    /**
     * Get projection of the vector to plane where n - normal to the plane.
     * @static
     * @param {Vec3} b - Vector to project.
     * @param {Vec3} n - Plane normal.
     * @param {Vec3} [def] - Default value for non existed result.
     * @returns {Vec3} -
     */
    static proj_b_to_plane(b: Vec3, n: Vec3, def?: Vec3): Vec3 {
        let res = b.sub(n.scaleTo(n.dot(b) / n.dot(n)));
        if (def && res.isZero()) {
            return new Vec3(def.x, def.y, def.z);
        }
        return res;
    }

    /**
     * Get projection of the first vector to the second.
     * @static
     * @param {Vec3} b - First vector.
     * @param {Vec3} a - Second vector.
     * @returns {Vec3} -
     */
    static proj_b_to_a(b: Vec3, a: Vec3): Vec3 {
        return a.scaleTo(a.dot(b) / a.dot(a));
    }

    /**
     * Makes vectors normalized and orthogonal to each other.
     * Normalizes normal. Normalizes tangent and makes sure it is orthogonal to normal (that is, angle between them is 90 degrees).
     * @static
     * @param {Vec3} normal - Normal vector.
     * @param {Vec3} tangent - Tangent vector.
     * @returns {Vec3} -
     */
    static orthoNormalize(normal: Vec3, tangent: Vec3): Vec3 {
        normal = normal.getNormal();
        normal.scale(tangent.dot(normal));
        return tangent.subA(normal).normalize();
    }

    /**
     * Returns vector components division product one to another.
     * @static
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Vec3} -
     */
    static div(a: Vec3, b: Vec3): Vec3 {
        let res = new Vec3(a.x, a.y, a.z);
        res.divA(b);
        return res;
    }

    static length2(a: Vec3): number {
        return a.length2();
    }

    // static length(a: Vec3): number {
    //     return a.length();
    // }

    static dot(a: Vec3, b: Vec3): number {
        return a.dot(b);
    }

    /**
     * Converts to 4d vector, Fourth value is 1.0.
     * @public
     * @returns {Vec4} -
     */
    public toVec4(): Vec4 {
        return new Vec4(this.x, this.y, this.z, 1.0);
    }

    /**
     * Returns clone vector.
     * @public
     * @returns {Vec3} -
     */
    public clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Converts vector to text string.
     * @public
     * @returns {string} -
     */
    public toString(): string {
        return `(${this.x},${this.y},${this.z})`;
    }

    /**
     * Returns true if vector's values are zero.
     * @public
     * @returns {boolean} -
     */
    public isZero(): boolean {
        return !(this.x || this.y || this.z);
    }

    /**
     * Get projection of the first vector to the second.
     * @static
     * @param {Vec3} a - Project vector.
     * @returns {Vec3} -
     */
    public projToVec(a: Vec3): Vec3 {
        return a.scaleTo(a.dot(this) / a.dot(a));
    }

    /**
     * Compares with vector. Returns true if it equals another.
     * @public
     * @param {Vec3} p - Vector to compare.
     * @returns {boolean} -
     */
    public equal(p: Vec3): boolean {
        return this.x === p.x && this.y === p.y && this.z === p.z;
    }

    /**
     * Copy input vector's values.
     * @param {Vec3} p - Vector to copy.
     * @returns {Vec3} -
     */
    public copy(p: Vec3): Vec3 {
        this.x = p.x;
        this.y = p.y;
        this.z = p.z;
        return this;
    }

    /**
     * Gets vector's length.
     * @public
     * @returns {number} -
     */
    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Returns squared vector's length.
     * @public
     * @returns {number} -
     */
    public length2(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /**
     * Converts vector's values to a quaternion object.
     * @public
     * @returns {Quat} -
     */
    public getQuat(): Quat {
        return new Quat(this.x, this.y, this.z);
    }

    /**
     * Adds vector to the current.
     * @public
     * @param {Vec3} p - Point to add.
     * @returns {Vec3} -
     */
    public addA(p: Vec3): Vec3 {
        this.x += p.x;
        this.y += p.y;
        this.z += p.z;
        return this;
    }

    /**
     * Gets two vectors summarization.
     * @public
     * @param {Vec3} p - Vector to add.
     * @returns {Vec3} Returns a sum vector.
     */
    public add(p: Vec3): Vec3 {
        return new Vec3(this.x + p.x, this.y + p.y, this.z + p.z);
    }

    /**
     * Subtract vector from the current.
     * @public
     * @param {Vec3} p - Subtract vector.
     * @returns {Vec3} -
     */
    public subA(p: Vec3): Vec3 {
        this.x -= p.x;
        this.y -= p.y;
        this.z -= p.z;
        return this;
    }

    /**
     * Gets vector subtraction.
     * @public
     * @param {Vec3} p - Subtract vector.
     * @return {Vec3} Returns new instance of a subtraction
     */
    public sub(p: Vec3): Vec3 {
        return new Vec3(this.x - p.x, this.y - p.y, this.z - p.z);
    }

    /**
     * Scale current vector.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec3} -
     */
    public scale(scale: number): Vec3 {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        return this;
    }

    /**
     * Scale current vector to another instance.
     * @public
     * @param {number} scale - Scale value.
     * @returns {Vec3} -
     */
    public scaleTo(scale: number): Vec3 {
        return new Vec3(this.x * scale, this.y * scale, this.z * scale);
    }

    /**
     * Multiply current vector object to another and store result in the current instance.
     * @public
     * @param {Vec3} vec - Multiply vector.
     * @returns {Vec3} -
     */
    public mulA(vec: Vec3): Vec3 {
        this.x *= vec.x;
        this.y *= vec.y;
        this.z *= vec.z;
        return this;
    }

    /**
     * Multiply current vector object to another and returns new vector instance.
     * @public
     * @param {Vec3} vec - Multiply vector.
     * @returns {Vec3} -
     */
    public mul(vec: Vec3): Vec3 {
        return new Vec3(this.x * vec.x, this.y * vec.y, this.z * vec.z);
    }

    /**
     * Divide current vector's components to another. Results stores in the current vector object.
     * @public
     * @param {Vec3} vec - Div vector.
     * @returns {Vec3} -
     */
    public divA(vec: Vec3): Vec3 {
        this.x /= vec.x;
        this.y /= vec.y;
        this.z /= vec.z;
        return this;
    }

    /**
     * Divide current vector's components to another and returns new vector instance.
     * @public
     * @param {Vec3} vec - Div vector.
     * @returns {Vec3} -
     */
    public div(vec: Vec3): Vec3 {
        return new Vec3(this.x / vec.x, this.y / vec.y, this.z / vec.z);
    }

    /**
     * Gets vectors dot production.
     * @public
     * @param {Vec3} a - Another vector.
     * @returns {number} -
     */
    public dot(a: Vec3): number {
        return a.x * this.x + a.y * this.y + a.z * this.z;
    }

    /**
     * Gets vectors dot production.
     * @public
     * @param {Array.<number>} arr - Array vector. (exactly 3 entries)
     * @returns {number} -
     */
    public dotArr(arr: NumberArray3 | NumberArray4): number {
        return arr[0] * this.x + arr[1] * this.y + arr[2] * this.z;
    }

    /**
     * Gets vectors cross production.
     * @public
     * @param {Vec3} point3 - Another vector.
     * @returns {Vec3} -
     */
    public cross(point3: Vec3): Vec3 {
        return new Vec3(
            this.y * point3.z - this.z * point3.y,
            this.z * point3.x - this.x * point3.z,
            this.x * point3.y - this.y * point3.x
        );
    }

    /**
     * Sets vector to zero.
     * @public
     * @returns {Vec3} -
     */
    public clear(): Vec3 {
        this.x = this.y = this.z = 0;
        return this;
    }

    /**
     * Returns normalized vector.
     * @public
     * @returns {Vec3} -
     */
    public getNormal(): Vec3 {
        let res = new Vec3();
        res.copy(this);

        let length = 1.0 / res.length();

        res.x *= length;
        res.y *= length;
        res.z *= length;

        return res;
    }

    /**
     * Returns normalized vector.
     * @deprecated
     * @public
     * @returns {Vec3} -
     */
    public normal(): Vec3 {
        let res = new Vec3();
        res.copy(this);

        let length = 1.0 / res.length();

        res.x *= length;
        res.y *= length;
        res.z *= length;

        return res;
    }

    /**
     * Returns normalized negate vector.
     * @public
     * @returns {Vec3} -
     */
    public normalNegate(): Vec3 {
        let res = new Vec3();
        res.copy(this);

        let length = -1.0 / res.length();

        res.x *= length;
        res.y *= length;
        res.z *= length;

        return res;
    }

    /**
     * Returns normalized negate scale vector.
     * @public
     * @returns {Vec3} -
     */
    public normalNegateScale(scale: number): Vec3 {
        let res = new Vec3();
        res.copy(this);

        let length = -scale / res.length();

        res.x *= length;
        res.y *= length;
        res.z *= length;

        return res;
    }

    /**
     * Returns normalized scale vector.
     * @public
     * @returns {Vec3} -
     */
    public normalScale(scale: number): Vec3 {
        let res = new Vec3();
        res.copy(this);

        let length = scale / res.length();

        res.x *= length;
        res.y *= length;
        res.z *= length;

        return res;
    }

    /**
     * Normalize current vector.
     * @public
     * @returns {Vec3} -
     */
    public normalize(): Vec3 {
        let length = 1.0 / this.length();
        this.x *= length;
        this.y *= length;
        this.z *= length;
        return this;
    }

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number>} - (exactly 3 entries)
     * @deprecated
     */
    public toVec(): NumberArray3 {
        return [this.x, this.y, this.z];
    }

    /**
     * Converts vector to a number array.
     * @public
     * @returns {Array.<number>} - (exactly 3 entries)
     */
    public toArray(): NumberArray3 {
        return [this.x, this.y, this.z];
    }

    /**
     * Gets distance to point.
     * @public
     * @param {Vec3} p - Distant point.
     * @returns {number} -
     */
    public distance(p: Vec3): number {
        let dx = this.x - p.x,
            dy = this.y - p.y,
            dz = this.z - p.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Gets square distance to point.
     * @public
     * @param {Vec3} p - Distant point.
     * @returns {number} -
     */
    public distance2(p: Vec3): number {
        let dx = this.x - p.x,
            dy = this.y - p.y,
            dz = this.z - p.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Sets vector's values.
     * @public
     * @param {number} x - Value X.
     * @param {number} y - Value Y.
     * @param {number} z - Value Z.
     * @returns {Vec3} -
     */
    public set(x: number, y: number, z: number): Vec3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Negate current vector.
     * @public
     * @returns {Vec3} -
     */
    public negate(): Vec3 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Negate current vector to another instance.
     * @public
     * @returns {Vec3} -
     */
    public negateTo(): Vec3 {
        return new Vec3(-this.x, -this.y, -this.z);
    }

    /**
     * Gets projected point coordinates of the current vector on the ray.
     * @public
     * @param {Vec3} pos - Ray position.
     * @param {Vec3} direction - Ray direction.
     * @returns {Vec3} -
     */
    public projToRay(pos: Vec3, direction: Vec3): Vec3 {
        let v = Vec3.proj_b_to_a(Vec3.sub(this, pos), direction);
        v.addA(pos);
        return v;
    }

    /**
     * Gets angle between two vectors.
     * @public
     * @param {Vec3} a - Another vector.
     * @returns {number} -
     */
    public angle(a: Vec3): number {
        return Vec3.angle(this, a);
    }

    /**
     * Returns two vectors linear interpolation.
     * @public
     * @param {Vec3} v2 - End vector.
     * @param {number} l - Interpolate value.
     * @returns {Vec3} -
     */
    public lerp(v2: Vec3, l: number) {
        return new Vec3(
            this.x + (v2.x - this.x) * l,
            this.y + (v2.y - this.y) * l,
            this.z + (v2.z - this.z) * l
        );
    }

    /**
     * Returns vector interpolation by v(t) = v1 * t + v2 * (1 - t)
     * @public
     * @param {Vec3} v2 - End vector.
     * @param {number} t - Interpolate value.
     * @returns {Vec3} -
     */
    public smerp(v2: Vec3, t: number): Vec3 {
        let one_d = 1 - t;
        return new Vec3(
            this.x * t + v2.x * one_d,
            this.y * t + v2.y * one_d,
            this.z * t + v2.z * one_d
        );
    }

    static get LERP_DELTA(): number {
        return 1e-6;
    }

    /**
     * Spherically interpolates between two vectors.
     * Interpolates between current and v2 vector by amount t. The difference between this and linear interpolation (aka, "lerp") is that
     * the vectors are treated as directions rather than points in space. The direction of the returned vector is interpolated
     * by the angle and its magnitude is interpolated between the magnitudes of from and to.
     * @public
     * @param {Vec3} v2 -
     * @param {number} t - The parameter t is clamped to the range [0, 1].
     * @returns {Vec3} -
     */
    public slerp(v2: Vec3, t: number): Vec3 {
        let res = new Vec3();

        if (t <= 0.0) {
            res.copy(this);
            return res;
        } else if (t >= 1.0) {
            res.copy(v2);
            return res;
        }

        let omega, sinom, scale0, scale1;
        let cosom = this.dot(v2);

        if (1.0 - cosom > Vec3.LERP_DELTA) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        return Vec3.add(this.scaleTo(scale0), v2.scale(scale1));
    }

    /**
     * Gets the shortest arc quaternion to rotate this vector to the destination vector.
     * @param {Vec3} dest -
     * @param {Vec3} fallbackAxis -
     * @returns {Quat} -
     * @todo: TEST IT!
     */
    public getRotationTo(dest: Vec3, fallbackAxis: Vec3): Quat {
        // Based on Stan Melax's article in Game Programming Gems
        // Copy, since cannot modify local
        let v0 = this.clone();
        let v1 = dest.clone();
        v0.normalize();
        v1.normalize();

        let d = v0.dot(v1);
        // If dot == 1, vectors are the same
        if (d >= 1.0) {
            return Quat.IDENTITY.clone();
        }

        if (d < 1e-6 - 1.0) {
            if (!fallbackAxis.equal(Vec3.ZERO)) {
                // rotate 180 degrees about the fallback axis
                return Quat.axisAngleToQuat(fallbackAxis, Math.PI);
            } else {
                // Generate an axis
                let axis = Vec3.UNIT_X.cross(v0);
                if (axis.isZero()) {
                    // pick another if colinear
                    axis = Vec3.UNIT_Y.cross(v0);
                }
                axis.normalize();
                return Quat.axisAngleToQuat(axis, Math.PI);
            }
        } else {
            let s = Math.sqrt((1 + d) * 2);
            let invs = 1.0 / s;
            let c = v0.cross(v1);
            let q = new Quat(c.x * invs, c.y * invs, c.z * invs, s * 0.5);
            q.normalize();
            return q;
        }
    }
}

/**
 * Vector 3d object creator.
 * @function
 * @param {number} [x] - value X.
 * @param {number} [y] - value Y.
 * @param {number} [z] - value Z.
 * @returns {Vec3} -
 */
export function vec3(x: number = 0, y: number = 0, z: number = 0): Vec3 {
    return new Vec3(x, y, z);
}
