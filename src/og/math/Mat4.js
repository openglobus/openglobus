'use strict';

import { Mat3 } from './Mat3.js';
import { Quat } from './Quat.js';
import { Vec3 } from './Vec3.js';
import { Vec4 } from './Vec4.js';

/**
 * Class represents a 4x4 matrix.
 * @class
 */
const Mat4 = function () {
    /**
     * A 4x4 matrix, indexable as a column-major order array.
     * @public
     * @type {Array.<number>}
     */
    this._m = new Array(16);

    /**
     * Projection frustum left value.
     * @public
     */
    this.left = 0.0;
    /**
     * Projection frustum right value.
     * @public
     */
    this.right = 0.0;
    /**
     * Projection frustum bottom value.
     * @public
     */
    this.bottom = 0.0;
    /**
     * Projection frustum top value.
     * @public
     */
    this.top = 0.0;
    /**
     * Projection frustum near value.
     * @public
     */
    this.near = 0.0;
    /**
     * Projection frustum far value.
     * @public
     */
    this.far = 0.0;
};

/**
 * Mat4 factory.
 * @static
 * @returns {og.Mat4} -
 */
export function mat4() {
    return new og.Mat4();
};

/**
 * Returns identity matrix instance.
 * @static
 * @returns {og.Mat4} -
 */
Mat4.identity = function () {
    var res = new Mat4();
    res._m[0] = 1; res._m[1] = 0; res._m[2] = 0; res._m[3] = 0;
    res._m[4] = 0; res._m[5] = 1; res._m[6] = 0; res._m[7] = 0;
    res._m[8] = 0; res._m[9] = 0; res._m[10] = 1; res._m[11] = 0;
    res._m[12] = 0; res._m[13] = 0; res._m[14] = 0; res._m[15] = 1;
    return res;
};

/**
 * Sets column-major order array matrix.
 * @public
 * @param {Array.<number>} m - Matrix array.
 * @returns {og.Mat4} -
 */
Mat4.prototype.set = function (m) {
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
};

/**
 * Duplicates a Matrix3 instance.
 * @public
 * @returns {og.Mat4} -
 */
Mat4.prototype.clone = function () {
    var res = new Mat4();
    res.set(this);
    return res;
};

/**
 * Copy matrix.
 * @public
 * @param {og.Mat3} a - Matrix to copy.
 */
Mat4.prototype.copy = function (a) {
    this.set(a._m);
};

/**
 * Converts to 3x3 matrix.
 * @public
 * @returns {og.Mat3} -
 */
Mat4.prototype.toMatrix3 = function () {
    var res = new Mat3();
    var a = this._m,
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
};

/**
 * Multiply to 3d vector.
 * @public
 * @param {og.Vec3} p - 3d vector.
 * @returns {og.Vec3} -
 */
Mat4.prototype.mulVec3 = function (p) {
    var d = p.x, e = p.y, g = p.z;
    return new Vec3(
        this._m[0] * d + this._m[4] * e + this._m[8] * g + this._m[12],
        this._m[1] * d + this._m[5] * e + this._m[9] * g + this._m[13],
        this._m[2] * d + this._m[6] * e + this._m[10] * g + this._m[14]
    );
};

/**
 * Multiply to 4d vector.
 * @public
 * @param {og.Vec4} p - 4d vector.
 * @returns {og.Vec4} -
 */
Mat4.prototype.mulVec4 = function (p) {
    var d = p.x, e = p.y, g = p.z, f = p.w;
    return new Vec4(
        this._m[0] * d + this._m[4] * e + this._m[8] * g + this._m[12] * f,
        this._m[1] * d + this._m[5] * e + this._m[9] * g + this._m[13] * f,
        this._m[2] * d + this._m[6] * e + this._m[10] * g + this._m[14] * f,
        this._m[3] * d + this._m[7] * e + this._m[11] * g + this._m[15] * f
    );
};

/**
 * Creates an inversed 3x3 matrix of the current.
 * @public
 * @returns {og.Mat3} -
 */
Mat4.prototype.toInverseMatrix3 = function () {
    var a = this._m;
    var c = a[0], d = a[1], e = a[2],
        g = a[4], f = a[5], h = a[6],
        i = a[8], j = a[9], k = a[10],
        l = k * f - h * j,
        o = -k * g + h * i,
        m = j * g - f * i,
        n = c * l + d * o + e * m;

    if (!n) {
        return null;
    }

    n = 1 / n;

    var res = new Mat3();
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
};

/**
 * Creates an inversed matrix of the current.
 * @public
 * @returns {og.Mat4} -
 */
Mat4.prototype.inverseTo = function () {
    var c = this._m[0], d = this._m[1], e = this._m[2], g = this._m[3],
        f = this._m[4], h = this._m[5], i = this._m[6], j = this._m[7],
        k = this._m[8], l = this._m[9], o = this._m[10], m = this._m[11],
        n = this._m[12], p = this._m[13], r = this._m[14], s = this._m[15],
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
        q = 1 / (A * E - B * D + t * C + u * z - v * y + w * x),
        res = new Mat4();

    res._m[0] = (h * E - i * D + j * C) * q; res._m[1] = (-d * E + e * D - g * C) * q; res._m[2] = (p * w - r * v + s * u) * q; res._m[3] = (-l * w + o * v - m * u) * q;
    res._m[4] = (-f * E + i * z - j * y) * q; res._m[5] = (c * E - e * z + g * y) * q; res._m[6] = (-n * w + r * t - s * B) * q; res._m[7] = (k * w - o * t + m * B) * q;
    res._m[8] = (f * D - h * z + j * x) * q; res._m[9] = (-c * D + d * z - g * x) * q; res._m[10] = (n * v - p * t + s * A) * q; res._m[11] = (-k * v + l * t - m * A) * q;
    res._m[12] = (-f * C + h * y - i * x) * q; res._m[13] = (c * C - d * y + e * x) * q; res._m[14] = (-n * u + p * B - r * A) * q; res._m[15] = (k * u - l * B + o * A) * q;
    return res;
};

/**
 * Creates a trasposed matrix of the current.
 * @public
 * @returns {og.Mat4} -
 */
Mat4.prototype.transposeTo = function () {
    var res = new Mat4();
    res._m[0] = this._m[0]; res._m[1] = this._m[4]; res._m[2] = this._m[8]; res._m[3] = this._m[12];
    res._m[4] = this._m[1]; res._m[5] = this._m[5]; res._m[6] = this._m[9]; res._m[7] = this._m[13];
    res._m[8] = this._m[2]; res._m[9] = this._m[6]; res._m[10] = this._m[10]; res._m[11] = this._m[14];
    res._m[12] = this._m[3]; res._m[13] = this._m[7]; res._m[14] = this._m[11]; res._m[15] = this._m[15];
    return res;
};

/**
 * Sets matrix to identity.
 * @public
 * @returns {og.Mat4} -
 */
Mat4.prototype.setIdentity = function () {
    this._m[0] = 1; this._m[1] = 0; this._m[2] = 0; this._m[3] = 0;
    this._m[4] = 0; this._m[5] = 1; this._m[6] = 0; this._m[7] = 0;
    this._m[8] = 0; this._m[9] = 0; this._m[10] = 1; this._m[11] = 0;
    this._m[12] = 0; this._m[13] = 0; this._m[14] = 0; this._m[15] = 1;
    return this;
};

/**
 * Computes the product of two matrices.
 * @public
 * @param {og.Mat4} mx - Matrix to multiply.
 * @returns {og.Mat4} -
 */
Mat4.prototype.mul = function (mx) {
    let d = this._m[0], e = this._m[1], g = this._m[2], f = this._m[3],
        h = this._m[4], i = this._m[5], j = this._m[6], k = this._m[7],
        l = this._m[8], o = this._m[9], m = this._m[10], n = this._m[11],
        p = this._m[12], r = this._m[13], s = this._m[14], a = this._m[15];

    let A = mx._m[0], B = mx._m[1], t = mx._m[2], u = mx._m[3],
        v = mx._m[4], w = mx._m[5], x = mx._m[6], y = mx._m[7],
        z = mx._m[8], C = mx._m[9], D = mx._m[10], E = mx._m[11],
        q = mx._m[12], F = mx._m[13], G = mx._m[14], b = mx._m[15];

    var res = new Mat4();
    res._m[0] = A * d + B * h + t * l + u * p; res._m[1] = A * e + B * i + t * o + u * r; res._m[2] = A * g + B * j + t * m + u * s; res._m[3] = A * f + B * k + t * n + u * a;
    res._m[4] = v * d + w * h + x * l + y * p; res._m[5] = v * e + w * i + x * o + y * r; res._m[6] = v * g + w * j + x * m + y * s; res._m[7] = v * f + w * k + x * n + y * a;
    res._m[8] = z * d + C * h + D * l + E * p; res._m[9] = z * e + C * i + D * o + E * r; res._m[10] = z * g + C * j + D * m + E * s; res._m[11] = z * f + C * k + D * n + E * a;
    res._m[12] = q * d + F * h + G * l + b * p; res._m[13] = q * e + F * i + G * o + b * r; res._m[14] = q * g + F * j + G * m + b * s; res._m[15] = q * f + F * k + G * n + b * a;
    return res;
};

/**
 * Add translation vector to the current matrix.
 * @public
 * @param {og.Vec3} v - Translate vector.
 * @returns {og.Mat4} -
 */
Mat4.prototype.translate = function (v) {
    var d = v.x, e = v.y, b = v.z;
    var a = this._m;
    a[12] = a[0] * d + a[4] * e + a[8] * b + a[12];
    a[13] = a[1] * d + a[5] * e + a[9] * b + a[13];
    a[14] = a[2] * d + a[6] * e + a[10] * b + a[14];
    a[15] = a[3] * d + a[7] * e + a[11] * b + a[15];
    return this;
};

/**
 * Sets translation matrix to the position.
 * @public
 * @param {og.Vec3} v - Translate to position.
 * @returns {og.Mat4} -
 */
Mat4.prototype.translateToPosition = function (v) {
    var a = this._m;
    a[12] = v.x;
    a[13] = v.y;
    a[14] = v.z;
    return this;
};

/**
 * Rotate currrent matrix around the aligned axis and angle.
 * @public
 * @param {og.Vec3} u - Aligned axis.
 * @param {number} angle - Aligned axis angle in radians.
 * @returns {og.Mat4} -
 * @todo: OPTIMIZE: reveal multiplication
 */
Mat4.prototype.rotate = function (u, angle) {
    var c = Math.cos(angle),
        s = Math.sin(angle);
    var rot = new Mat4();
    var mx = rot._m;
    mx[0] = c + (1 - c) * u.x * u.x; mx[1] = (1 - c) * u.y * u.x - s * u.z; mx[2] = (1 - c) * u.z * u.x + s * u.y; mx[3] = 0;
    mx[4] = (1 - c) * u.x * u.y + s * u.z; mx[5] = c + (1 - c) * u.y * u.y; mx[6] = (1 - c) * u.z * u.y - s * u.x; mx[7] = 0;
    mx[8] = (1 - c) * u.x * u.z - s * u.y; mx[9] = (1 - c) * u.y * u.z + s * u.x; mx[10] = c + (1 - c) * u.z * u.z; mx[11] = 0;
    mx[12] = 0; mx[13] = 0; mx[14] = 0; mx[15] = 1;
    return this.mul(rot);
};

/**
 * Sets current rotation matrix around the aligned axis and angle.
 * @public
 * @param {og.Vec3} u - Aligned axis.
 * @param {number} angle - Aligned axis angle in radians.
 * @returns {og.Mat4} -
 */
Mat4.prototype.setRotation = function (u, angle) {
    var c = Math.cos(angle),
        s = Math.sin(angle);
    var mx = this._m;
    mx[0] = c + (1 - c) * u.x * u.x; mx[1] = (1 - c) * u.y * u.x - s * u.z; mx[2] = (1 - c) * u.z * u.x + s * u.y; mx[3] = 0;
    mx[4] = (1 - c) * u.x * u.y + s * u.z; mx[5] = c + (1 - c) * u.y * u.y; mx[6] = (1 - c) * u.z * u.y - s * u.x; mx[7] = 0;
    mx[8] = (1 - c) * u.x * u.z - s * u.y; mx[9] = (1 - c) * u.y * u.z + s * u.x; mx[10] = c + (1 - c) * u.z * u.z; mx[11] = 0;
    mx[12] = 0; mx[13] = 0; mx[14] = 0; mx[15] = 1;
    return this;
};

/**
 * Gets the rotation matrix from one vector to another.
 * @public
 * @param {og.Vec3} a - Firtst vector.
 * @param {og.Vec3} b - Second vector.
 * @returns {og.Mat4} -
 */
Mat4.prototype.rotateBetweenVectors = function (a, b) {
    var q = Quat.getRotationBetweenVectors(a, b);
    return q.getMat4();
};

/**
 * Scale current matrix to the vector values.
 * @public
 * @param {og.Vec3} v - Scale vector.
 * @returns {og.Mat4} -
 */
Mat4.prototype.scale = function (v) {
    var mx = this._m;
    mx[0] = mx[0] * v.x; mx[1] = mx[1] * v.x; mx[2] = mx[2] * v.x; mx[3] = mx[3] * v.x;
    mx[4] = mx[4] * v.y; mx[5] = mx[5] * v.y; mx[6] = mx[6] * v.y; mx[7] = mx[7] * v.y;
    mx[8] = mx[8] * v.z; mx[9] = mx[9] * v.z; mx[10] = mx[10] * v.z; mx[11] = mx[11] * v.z;
    return this;
};

/**
 * Sets perspective projection matrix frustum values.
 * @public
 * @param {number} left -
 * @param {number} right -
 * @param {number} bottom -
 * @param {number} top -
 * @param {number} near -
 * @param {number} far -
 * @returns {og.Mat4} -
 */
Mat4.prototype.setFrustum = function (left, right, bottom, top, near, far) {

    var h = right - left, i = top - bottom, j = far - near;
    this._m[0] = near * 2 / h;
    this._m[1] = 0;
    this._m[2] = 0;
    this._m[3] = 0;
    this._m[4] = 0;
    this._m[5] = near * 2 / i;
    this._m[6] = 0;
    this._m[7] = 0;
    this._m[8] = (right + left) / h;
    this._m[9] = (top + bottom) / i;
    this._m[10] = -(far + near) / j;
    this._m[11] = -1;
    this._m[12] = 0;
    this._m[13] = 0;
    this._m[14] = -(far * near * 2) / j;
    this._m[15] = 0;
    return this;
};

/**
 * Creates current percpective projection matrix.
 * @public
 * @param {number} angle - View angle in degrees.
 * @param {number} aspect - Screen aspect ratio.
 * @param {number} near - Near clip plane.
 * @param {number} far - Far clip plane.
 * @returns {og.Mat4} -
 */
Mat4.prototype.setPerspective = function (angle, aspect, near, far) {
    angle = near * Math.tan(angle * Math.PI / 360);
    aspect = angle * aspect;
    return this.setFrustum(-aspect, aspect, -angle, angle, near, far);
};

/**
 * Creates current orthographic projection matrix.
 * @public
 * @param {number} left -
 * @param {number} right -
 * @param {number} bottom -
 * @param {number} top -
 * @param {number} near -
 * @param {number} far -
 * @return {og.Mat4} -
 */
Mat4.prototype.setOrtho = function (left, right, bottom, top, near, far) {

    var lr = 1.0 / (left - right),
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
};

/**
 * Sets current rotation matrix by euler's angles.
 * @public
 * @param {number} ax - Rotation angle in radians arond X axis.
 * @param {number} ay - Rotation angle in radians arond Y axis.
 * @param {number} az - Rotation angle in radians arond Z axis.
 * @returns {og.Mat4} -
 */
Mat4.prototype.eulerToMatrix = function (ax, ay, az) {
    var a = Math.cos(ax),
        b = Math.sin(ax),
        c = Math.cos(ay),
        d = Math.sin(ay),
        e = Math.cos(az),
        f = Math.sin(az);

    var ad = a * d,
        bd = b * d;

    var mat = this._m;

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
};

export { Mat4 };