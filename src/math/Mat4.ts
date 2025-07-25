import {Mat3} from "./Mat3";
import {Quat} from "./Quat";
import {Vec3} from "./Vec3";
import {Vec4} from "./Vec4";

export type NumberArray16 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

/**
 * Class represents a 4x4 matrix.
 * @class
 */
export class Mat4 {

    /**
     * A 4x4 matrix, index-able as a column-major order array.
     * @public
     * @type {Array.<number>}
     */
    public _m: NumberArray16 = [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ];

    constructor() {
    }

    /**
     * Returns identity matrix instance.
     * @static
     * @returns {Mat4} -
     */
    static identity(): Mat4 {
        let res = new Mat4();
        res._m[0] = 1;
        res._m[1] = 0;
        res._m[2] = 0;
        res._m[3] = 0;
        res._m[4] = 0;
        res._m[5] = 1;
        res._m[6] = 0;
        res._m[7] = 0;
        res._m[8] = 0;
        res._m[9] = 0;
        res._m[10] = 1;
        res._m[11] = 0;
        res._m[12] = 0;
        res._m[13] = 0;
        res._m[14] = 0;
        res._m[15] = 1;
        return res;
    }

    /**
     * Get rotation matrix around the point
     * @public
     * @param {number} angle - Rotation angle in radians
     * @param {Vec3} [center] - Point that the camera rotates around
     * @param {Vec3} [up] - Camera up vector
     */
    static getRotationAroundPoint(angle: number, center: Vec3 = Vec3.ZERO, up: Vec3 = Vec3.UP): Mat4 {
        let rot = Mat4.getRotation(angle, up);
        let tr = new Mat4().setIdentity().translate(center);
        let ntr = new Mat4().setIdentity().translate(center.negateTo());
        return tr.mul(rot).mul(ntr);
    }

    static getRotation(angle: number, up: Vec3 = Vec3.UP): Mat4 {
        return new Mat4().setRotation(up, angle);
    }

    public getPosition(): Vec3 {
        return new Vec3(this._m[12], this._m[13], this._m[14]);
    }

    public getScaling(): Vec3 {
        let m11 = this._m[0];
        let m12 = this._m[1];
        let m13 = this._m[2];
        let m21 = this._m[4];
        let m22 = this._m[5];
        let m23 = this._m[6];
        let m31 = this._m[8];
        let m32 = this._m[9];
        let m33 = this._m[10];

        return new Vec3(
            Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13),
            Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23),
            Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33)
        );
    }

    public getQuat(): Quat {
        let scaling = this.getScaling();
        const out = [0, 0, 0, 1];

        let is1 = 1 / scaling.x;
        let is2 = 1 / scaling.y;
        let is3 = 1 / scaling.z;

        let sm11 = this._m[0] * is1;
        let sm12 = this._m[1] * is2;
        let sm13 = this._m[2] * is3;
        let sm21 = this._m[4] * is1;
        let sm22 = this._m[5] * is2;
        let sm23 = this._m[6] * is3;
        let sm31 = this._m[8] * is1;
        let sm32 = this._m[9] * is2;
        let sm33 = this._m[10] * is3;

        let trace = sm11 + sm22 + sm33;
        let S = 0;

        if (trace > 0) {
            S = Math.sqrt(trace + 1.0) * 2;
            out[3] = 0.25 * S;
            out[0] = (sm23 - sm32) / S;
            out[1] = (sm31 - sm13) / S;
            out[2] = (sm12 - sm21) / S;
        } else if (sm11 > sm22 && sm11 > sm33) {
            S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
            out[3] = (sm23 - sm32) / S;
            out[0] = 0.25 * S;
            out[1] = (sm12 + sm21) / S;
            out[2] = (sm31 + sm13) / S;
        } else if (sm22 > sm33) {
            S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
            out[3] = (sm31 - sm13) / S;
            out[0] = (sm12 + sm21) / S;
            out[1] = 0.25 * S;
            out[2] = (sm23 + sm32) / S;
        } else {
            S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
            out[3] = (sm12 - sm21) / S;
            out[0] = (sm31 + sm13) / S;
            out[1] = (sm23 + sm32) / S;
            out[2] = 0.25 * S;
        }
        return new Quat(...out);
    }


    /**
     * Sets column-major order array matrix.
     * @public
     * @param {Array.<number>} m - Matrix array.
     * @returns {Mat4} -
     */
    public set(m: NumberArray16): Mat4 {
        this._m[0] = m[0];
        this._m[1] = m[1];
        this._m[2] = m[2];
        this._m[3] = m[3];
        this._m[4] = m[4];
        this._m[5] = m[5];
        this._m[6] = m[6];
        this._m[7] = m[7];
        this._m[8] = m[8];
        this._m[9] = m[9];
        this._m[10] = m[10];
        this._m[11] = m[11];
        this._m[12] = m[12];
        this._m[13] = m[13];
        this._m[14] = m[14];
        this._m[15] = m[15];
        return this;
    }

    /**
     * Duplicates a Matrix3 instance.
     * @public
     * @returns {Mat4} -
     */
    public clone(): Mat4 {
        let res = new Mat4();
        res.set(this._m);
        return res;
    }

    /**
     * Copy matrix.
     * @public
     * @param {Mat4} a - Matrix to copy.
     * @return {Mat4}
     */
    public copy(a: Mat4): Mat4 {
        return this.set(a._m);
    }

    /**
     * Converts to 3x3 matrix.
     * @public
     * @returns {Mat3} -
     */
    public getMat3(): Mat3 {
        let res = new Mat3();
        let a = this._m,
            b = res._m;
        b[0] = a[0];
        b[1] = a[1];
        b[2] = a[2];
        b[3] = a[4];
        b[4] = a[5];
        b[5] = a[6];
        b[6] = a[8];
        b[7] = a[9];
        b[8] = a[10];
        return res;
    }

    /**
     * Multiply to 3d vector.
     * @public
     * @param {Vec3} p - 3d vector.
     * @returns {Vec3} -
     */
    public mulVec3(p: Vec3): Vec3 {
        let d = p.x,
            e = p.y,
            g = p.z;
        return new Vec3(
            this._m[0] * d + this._m[4] * e + this._m[8] * g + this._m[12],
            this._m[1] * d + this._m[5] * e + this._m[9] * g + this._m[13],
            this._m[2] * d + this._m[6] * e + this._m[10] * g + this._m[14]
        );
    }

    /**
     * Multiply to 4d vector.
     * @public
     * @param {Vec4} p - 4d vector.
     * @returns {Vec4} -
     */
    public mulVec4(p: Vec4): Vec4 {
        let d = p.x,
            e = p.y,
            g = p.z,
            f = p.w;
        return new Vec4(
            this._m[0] * d + this._m[4] * e + this._m[8] * g + this._m[12] * f,
            this._m[1] * d + this._m[5] * e + this._m[9] * g + this._m[13] * f,
            this._m[2] * d + this._m[6] * e + this._m[10] * g + this._m[14] * f,
            this._m[3] * d + this._m[7] * e + this._m[11] * g + this._m[15] * f
        );
    }

    /**
     * Creates an inverse 3x3 matrix of the current.
     * @public
     * @returns {Mat3} -
     */
    public toInverseMatrix3(): Mat3 | undefined {
        let a = this._m;
        let c = a[0],
            d = a[1],
            e = a[2],
            g = a[4],
            f = a[5],
            h = a[6],
            i = a[8],
            j = a[9],
            k = a[10],
            l = k * f - h * j,
            o = -k * g + h * i,
            m = j * g - f * i,
            n = c * l + d * o + e * m;

        if (!n) {
            return;
        }

        n = 1.0 / n;

        let res = new Mat3();
        res._m[0] = l * n;
        res._m[1] = (-k * d + e * j) * n;
        res._m[2] = (h * d - e * f) * n;
        res._m[3] = o * n;
        res._m[4] = (k * c - e * i) * n;
        res._m[5] = (-h * c + e * g) * n;
        res._m[6] = m * n;
        res._m[7] = (-j * c + d * i) * n;
        res._m[8] = (f * c - d * g) * n;

        return res;
    }

    /**
     * Creates an inverse matrix of the current.
     * @public
     * @returns {Mat4} -
     */
    public inverseTo(res: Mat4 = new Mat4()): Mat4 {
        let c = this._m[0],
            d = this._m[1],
            e = this._m[2],
            g = this._m[3],
            f = this._m[4],
            h = this._m[5],
            i = this._m[6],
            j = this._m[7],
            k = this._m[8],
            l = this._m[9],
            o = this._m[10],
            m = this._m[11],
            n = this._m[12],
            p = this._m[13],
            r = this._m[14],
            s = this._m[15],
            A = c * h - d * f,
            B = c * i - e * f,
            t = c * j - g * f,
            u = d * i - e * h,
            v = d * j - g * h,
            w = e * j - g * i,
            x = k * p - l * n,
            y = k * r - o * n,
            z = k * s - m * n,
            C = l * r - o * p,
            D = l * s - m * p,
            E = o * s - m * r,
            q = 1 / (A * E - B * D + t * C + u * z - v * y + w * x);

        res._m[0] = (h * E - i * D + j * C) * q;
        res._m[1] = (-d * E + e * D - g * C) * q;
        res._m[2] = (p * w - r * v + s * u) * q;
        res._m[3] = (-l * w + o * v - m * u) * q;
        res._m[4] = (-f * E + i * z - j * y) * q;
        res._m[5] = (c * E - e * z + g * y) * q;
        res._m[6] = (-n * w + r * t - s * B) * q;
        res._m[7] = (k * w - o * t + m * B) * q;
        res._m[8] = (f * D - h * z + j * x) * q;
        res._m[9] = (-c * D + d * z - g * x) * q;
        res._m[10] = (n * v - p * t + s * A) * q;
        res._m[11] = (-k * v + l * t - m * A) * q;
        res._m[12] = (-f * C + h * y - i * x) * q;
        res._m[13] = (c * C - d * y + e * x) * q;
        res._m[14] = (-n * u + p * B - r * A) * q;
        res._m[15] = (k * u - l * B + o * A) * q;

        return res;
    }

    /**
     * Creates a transposed matrix of the current.
     * @public
     * @returns {Mat4} -
     */
    public transposeTo(): Mat4 {
        let res = new Mat4();
        res._m[0] = this._m[0];
        res._m[1] = this._m[4];
        res._m[2] = this._m[8];
        res._m[3] = this._m[12];
        res._m[4] = this._m[1];
        res._m[5] = this._m[5];
        res._m[6] = this._m[9];
        res._m[7] = this._m[13];
        res._m[8] = this._m[2];
        res._m[9] = this._m[6];
        res._m[10] = this._m[10];
        res._m[11] = this._m[14];
        res._m[12] = this._m[3];
        res._m[13] = this._m[7];
        res._m[14] = this._m[11];
        res._m[15] = this._m[15];
        return res;
    }

    /**
     * Sets matrix to identity.
     * @public
     * @returns {Mat4} -
     */
    public setIdentity(): Mat4 {
        this._m[0] = 1;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 1;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
        return this;
    }

    /**
     * Computes the product of two matrices.
     * @public
     * @param {Mat4} mx - Matrix to multiply.
     * @returns {Mat4} -
     */
    public mul(mx: Mat4): Mat4 {

        let d = this._m[0],
            e = this._m[1],
            g = this._m[2],
            f = this._m[3],
            h = this._m[4],
            i = this._m[5],
            j = this._m[6],
            k = this._m[7],
            l = this._m[8],
            o = this._m[9],
            m = this._m[10],
            n = this._m[11],
            p = this._m[12],
            r = this._m[13],
            s = this._m[14],
            a = this._m[15];

        let A = mx._m[0],
            B = mx._m[1],
            t = mx._m[2],
            u = mx._m[3],
            v = mx._m[4],
            w = mx._m[5],
            x = mx._m[6],
            y = mx._m[7],
            z = mx._m[8],
            C = mx._m[9],
            D = mx._m[10],
            E = mx._m[11],
            q = mx._m[12],
            F = mx._m[13],
            G = mx._m[14],
            b = mx._m[15];

        let res = new Mat4();

        res._m[0] = A * d + B * h + t * l + u * p;
        res._m[1] = A * e + B * i + t * o + u * r;
        res._m[2] = A * g + B * j + t * m + u * s;
        res._m[3] = A * f + B * k + t * n + u * a;
        res._m[4] = v * d + w * h + x * l + y * p;
        res._m[5] = v * e + w * i + x * o + y * r;
        res._m[6] = v * g + w * j + x * m + y * s;
        res._m[7] = v * f + w * k + x * n + y * a;
        res._m[8] = z * d + C * h + D * l + E * p;
        res._m[9] = z * e + C * i + D * o + E * r;
        res._m[10] = z * g + C * j + D * m + E * s;
        res._m[11] = z * f + C * k + D * n + E * a;
        res._m[12] = q * d + F * h + G * l + b * p;
        res._m[13] = q * e + F * i + G * o + b * r;
        res._m[14] = q * g + F * j + G * m + b * s;
        res._m[15] = q * f + F * k + G * n + b * a;

        return res;
    }

    /**
     * Add translation vector to the current matrix.
     * @public
     * @param {Vec3} v - Translate vector.
     * @returns {Mat4} -
     */
    public translate(v: Vec3): Mat4 {

        let d = v.x,
            e = v.y,
            b = v.z;

        let a = this._m;

        a[12] = a[0] * d + a[4] * e + a[8] * b + a[12];
        a[13] = a[1] * d + a[5] * e + a[9] * b + a[13];
        a[14] = a[2] * d + a[6] * e + a[10] * b + a[14];
        a[15] = a[3] * d + a[7] * e + a[11] * b + a[15];

        return this;
    }

    /**
     * Sets translation matrix to the position.
     * @public
     * @param {Vec3} v - Translate to position.
     * @returns {Mat4} -
     */
    public translateToPosition(v: Vec3): Mat4 {
        let a = this._m;
        a[12] = v.x;
        a[13] = v.y;
        a[14] = v.z;
        return this;
    }

    /**
     * Rotate current matrix around the aligned axis and angle.
     * @public
     * @param {Vec3} u - Aligned axis.
     * @param {number} angle - Aligned axis angle in radians.
     * @returns {Mat4} -
     */
    public rotate(u: Vec3, angle: number): Mat4 {

        let c = Math.cos(angle),
            s = Math.sin(angle);

        let rot = new Mat4();
        let mx = rot._m;

        mx[0] = c + (1 - c) * u.x * u.x;
        mx[1] = (1 - c) * u.y * u.x - s * u.z;
        mx[2] = (1 - c) * u.z * u.x + s * u.y;
        mx[3] = 0;
        mx[4] = (1 - c) * u.x * u.y + s * u.z;
        mx[5] = c + (1 - c) * u.y * u.y;
        mx[6] = (1 - c) * u.z * u.y - s * u.x;
        mx[7] = 0;
        mx[8] = (1 - c) * u.x * u.z - s * u.y;
        mx[9] = (1 - c) * u.y * u.z + s * u.x;
        mx[10] = c + (1 - c) * u.z * u.z;
        mx[11] = 0;
        mx[12] = 0;
        mx[13] = 0;
        mx[14] = 0;
        mx[15] = 1;

        return this.mul(rot);
    }

    /**
     * Sets current rotation matrix around the aligned axis and angle.
     * @public
     * @param {Vec3} u - Aligned axis.
     * @param {number} angle - Aligned axis angle in radians.
     * @returns {Mat4} -
     */
    public setRotation(u: Vec3, angle: number): Mat4 {

        let c = Math.cos(angle),
            s = Math.sin(angle);

        let mx = this._m;

        mx[0] = c + (1 - c) * u.x * u.x;
        mx[1] = (1 - c) * u.y * u.x - s * u.z;
        mx[2] = (1 - c) * u.z * u.x + s * u.y;
        mx[3] = 0;
        mx[4] = (1 - c) * u.x * u.y + s * u.z;
        mx[5] = c + (1 - c) * u.y * u.y;
        mx[6] = (1 - c) * u.z * u.y - s * u.x;
        mx[7] = 0;
        mx[8] = (1 - c) * u.x * u.z - s * u.y;
        mx[9] = (1 - c) * u.y * u.z + s * u.x;
        mx[10] = c + (1 - c) * u.z * u.z;
        mx[11] = 0;
        mx[12] = 0;
        mx[13] = 0;
        mx[14] = 0;
        mx[15] = 1;

        return this;
    }

    /**
     * Gets the rotation matrix from one vector to another.
     * @public
     * @param {Vec3} a - First vector.
     * @param {Vec3} b - Second vector.
     * @returns {Mat4} -
     */
    public rotateBetweenVectors(a: Vec3, b: Vec3): Mat4 {
        let q = Quat.getRotationBetweenVectors(a, b);
        return q.getMat4();
    }

    /**
     * Scale current matrix to the vector values.
     * @public
     * @param {Vec3} v - Scale vector.
     * @returns {Mat4} -
     */
    public scale(v: Vec3): Mat4 {
        let mx = this._m;
        mx[0] = mx[0] * v.x;
        mx[1] = mx[1] * v.x;
        mx[2] = mx[2] * v.x;
        mx[3] = mx[3] * v.x;
        mx[4] = mx[4] * v.y;
        mx[5] = mx[5] * v.y;
        mx[6] = mx[6] * v.y;
        mx[7] = mx[7] * v.y;
        mx[8] = mx[8] * v.z;
        mx[9] = mx[9] * v.z;
        mx[10] = mx[10] * v.z;
        mx[11] = mx[11] * v.z;
        return this;
    }

    /**
     * Sets perspective projection matrix frustum values.
     * @public
     * @param {number} left -
     * @param {number} right -
     * @param {number} bottom -
     * @param {number} top -
     * @param {number} near -
     * @param {number} far -
     * @returns {Mat4} -
     */
    public setPerspective(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {

        let h = right - left,
            i = top - bottom,
            j = near - far,
            n2 = 2 * near;

        let mm = this._m;

        mm[0] = n2 / h;
        mm[1] = 0;
        mm[2] = 0;
        mm[3] = 0;

        mm[4] = 0;
        mm[5] = n2 / i;
        mm[6] = 0;
        mm[7] = 0;

        mm[8] = (right + left) / h;
        mm[9] = (top + bottom) / i;
        mm[10] = (far + near) / j;
        mm[11] = -1;

        mm[12] = 0;
        mm[13] = 0;
        mm[14] = (n2 * far) / j;
        mm[15] = 0;

        return this;
    }

    /**
     * Creates current orthographic projection matrix.
     * @public
     * @param {number} left -
     * @param {number} right -
     * @param {number} bottom -
     * @param {number} top -
     * @param {number} near -
     * @param {number} far -
     * @return {Mat4} -
     */
    public setOrtho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {

        let lr = 1.0 / (left - right),
            bt = 1.0 / (bottom - top),
            nf = 1.0 / (near - far),
            m = this._m;

        m[0] = -2.0 * lr;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = -2.0 * bt;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 2.0 * nf;
        m[11] = 0;
        m[12] = (left + right) * lr;
        m[13] = (top + bottom) * bt;
        m[14] = (far + near) * nf;
        m[15] = 1.0;

        return this;
    }

    /**
     * Sets current rotation matrix by euler's angles.
     * @public
     * @param {number} ax - Rotation angle in radians around X axis.
     * @param {number} ay - Rotation angle in radians around Y axis.
     * @param {number} az - Rotation angle in radians around Z axis.
     * @returns {Mat4} -
     */
    public eulerToMatrix(ax: number, ay: number, az: number): Mat4 {

        let a = Math.cos(ax),
            b = Math.sin(ax),
            c = Math.cos(ay),
            d = Math.sin(ay),
            e = Math.cos(az),
            f = Math.sin(az);

        let ad = a * d,
            bd = b * d;

        let mat = this._m;

        mat[0] = c * e;
        mat[1] = -c * f;
        mat[2] = -d;
        mat[4] = -bd * e + a * f;
        mat[5] = bd * f + a * e;
        mat[6] = -b * c;
        mat[8] = ad * e + b * f;
        mat[9] = -ad * f + b * e;
        mat[10] = a * c;
        mat[3] = mat[7] = mat[11] = mat[12] = mat[13] = mat[14] = 0;
        mat[15] = 1;

        return this;
    }
}

/**
 * Mat4 factory.
 * @static
 * @returns {Mat4} -
 */
export function mat4(): Mat4 {
    return new Mat4();
}
