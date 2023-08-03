"use strict";

import {Mat4} from "./Mat4";
import {Vec3} from "./Vec3";

type NumberArray9 = [
    number, number, number,
    number, number, number,
    number, number, number
];

/**
 * Class represents a 3x3 matrix.
 * @class
 */
export class Mat3 {

    /**
     * A 3x3 matrix, indexing as a column-major order array.
     * @public
     * @type {Array.<number>}
     */
    public _m: NumberArray9 = [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0
    ];

    constructor() {
    }

    /**
     * Sets column-major order array matrix.
     * @public
     * @param {Array.<number>} m - Matrix array.
     * @returns {Mat3}
     */
    public set(m: NumberArray9): Mat3 {
        this._m[0] = m[0];
        this._m[1] = m[1];
        this._m[2] = m[2];
        this._m[3] = m[3];
        this._m[4] = m[4];
        this._m[5] = m[5];
        this._m[6] = m[6];
        this._m[7] = m[7];
        this._m[8] = m[8];
        return this;
    }

    /**
     * Duplicates a Mat3 instance.
     * @public
     * @returns {Mat3}
     */
    public clone(): Mat3 {
        let res = new Mat3();
        res.set(this._m);
        return res;
    }

    /**
     * Copy matrix.
     * @public
     * @param {Mat3} a - Matrix to copy.
     * @returns {Mat3}
     */
    public copy(a: Mat3): Mat3 {
        return this.set(a._m);
    }

    /**
     * Creates transposed matrix from the current.
     * @public
     * @returns {Mat3}
     */
    public transposeTo(): Mat3 {
        let res = new Mat3();
        let m = this._m;
        res._m[0] = m[0];
        res._m[1] = m[3];
        res._m[2] = m[6];
        res._m[3] = m[1];
        res._m[4] = m[4];
        res._m[5] = m[7];
        res._m[6] = m[2];
        res._m[7] = m[5];
        res._m[8] = m[8];
        return res;
    }

    /**
     * Sets matrix to identity.
     * @public
     * @returns {Mat3}
     */
    public setIdentity(): Mat3 {
        this._m[0] = 1;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 1;
        this._m[5] = 0;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 1;
        return this;
    }

    /**
     * Multiply to 3d vector.
     * @public
     * @params {Vec3} p - 3d vector.
     * @returns {Vec3}
     */
    public mulVec(p: Vec3): Vec3 {

        let d = p.x,
            e = p.y,
            g = p.z;

        let m = this._m;

        return new Vec3(
            m[0] * d + m[3] * e + m[6] * g,
            m[1] * d + m[4] * e + m[7] * g,
            m[2] * d + m[5] * e + m[8] * g
        );
    }

    /**
     * Converts to 4x4 matrix.
     * @public
     * @returns {Mat4}
     */
    public toMatrix4(): Mat4 {

        let res = new Mat4();
        let b = res._m;
        let a = this._m;

        b[0] = a[0];
        b[1] = a[1];
        b[2] = a[2];
        b[3] = 0;
        b[4] = a[3];
        b[5] = a[4];
        b[6] = a[5];
        b[7] = 0;
        b[8] = a[6];
        b[9] = a[7];
        b[10] = a[8];
        b[11] = 0;
        b[12] = 0;
        b[13] = 0;
        b[14] = 0;
        b[15] = 1;

        return res;
    }
}

/**
 * Mat3 factory.
 * @static
 * @return {Mat3}
 */
export function mat3(): Mat3 {
    return new Mat3();
}
