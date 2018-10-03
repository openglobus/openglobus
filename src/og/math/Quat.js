'use strict';

import * as math from '../math.js';
import { Mat4 } from './Mat4.js';
import { Mat3 } from './Mat3.js';
import { Vec3 } from './Vec3.js';

/**
 * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
 * @constructor
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 */
const Quat = function (x, y, z, w) {

    /**
     * The X component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    this.x = x || 0.0;

    /**
     * The Y component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    this.y = y || 0.0;

    /**
     * The Z component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    this.z = z || 0.0;

    /**
     * The W component.
     * @public
     * @type {Number}
     * @default 0.0
     */
    this.w = w || 0.0;
};

/**
 * Creates Quat instance.
 * @function
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 * @returns {og.Quat} -
 */
export function quat(x, y, z, w) {
    return new Quat(x, y, z, w);
};

/**
 * Identity Quat.
 * @const
 * @type {og.Quat}
 */
Quat.IDENTITY = new Quat(0.0, 0.0, 0.0, 1.0);

/**
 * Returns a Quat represents rotation around X axis.
 * @static
 * @param {number} a - The angle in radians to rotate around the axis.
 * @returns {og.Quat} -
 */
Quat.xRotation = function (a) {
    a *= 0.5;
    return new Quat(Math.sin(a), 0.0, 0.0, Math.cos(a));
};

/**
 * Returns a Quat represents rotation around Y axis.
 * @static
 * @param {number} a - The angle in radians to rotate around the axis.
 * @returns {og.Quat} -
 */
Quat.yRotation = function (a) {
    a *= 0.5;
    return new Quat(0.0, Math.sin(a), 0.0, Math.cos(a));
};

/**
 * Returns a Quat represents rotation around Z axis.
 * @static
 * @param {number} a - The angle in radians to rotate around the axis.
 * @returns {og.Quat} -
 */
Quat.zRotation = function (a) {
    a *= 0.5;
    return new Quat(0.0, 0.0, Math.sin(a), Math.cos(a));
};

/**
 * Computes a Quat representing a rotation around an axis.
 * @static
 * @param {og.Vec3} axis - The axis of rotation.
 * @param {number} [angle=0.0] The angle in radians to rotate around the axis.
 * @returns {og.Quat} -
 */
Quat.axisAngleToQuat = function (axis, angle) {
    angle = angle || 0.0;
    var v = axis.normal();
    var half_angle = angle * 0.5;
    var sin_a = Math.sin(half_angle);
    return new Quat(
        v.x * sin_a,
        v.y * sin_a,
        v.z * sin_a,
        Math.cos(half_angle));
};

/**
 * Computes a rotation from the given heading and up vector.
 * @static
 * @param {og.Vec3} target - Heading target coordinates.
 * @param {og.Vec3} up - Up vector.
 * @returns {og.Quat} -
 */
Quat.getLookAtTargetUp = function (target, up) {
    var forward = target.normal();
    // Keeps up the same, make forward orthogonal to up
    forward = Vec3.OrthoNormalize(up, forward);
    var right = up.cross(forward);
    var w = Math.sqrt(1.0 + right.x + up.y + forward.z) * 0.5;
    var w4_recip = 1.0 / (4.0 * w);
    return new Quat(
        (forward.y - up.z) * w4_recip,
        (right.z - forward.x) * w4_recip,
        (up.x - right.y) * w4_recip,
        w);
};

/**
 * Computes a Quat from from source point heading to the destination point.
 * @static
 * @param {og.Vec3} sourcePoint - Source coordinate.
 * @param {og.Vec3} destPoint - Destination coordinate.
 * @returns {og.Quat} -
 */
Quat.getLookAtSourceDest = function (sourcePoint, destPoint) {
    var forwardVector = destPoint.subA(sourcePoint).normalize();
    var dot = Vec3.FORWARD.dot(forwardVector);
    if (Math.abs(dot - (-1.0)) < 0.000001) {
        return Quat.axisAngleToQuat(Vec3.UP, Math.PI);
    }
    if (Math.abs(dot - (1.0)) < 0.000001) {
        return new Quat(0, 0, 0, 1);
    }
    var rotAngle = Math.acos(dot);
    var rotAxis = Vec3.FORWARD.cross(forwardVector).normalize();
    return Quat.axisAngleToQuat(rotAxis, rotAngle);
};

/**
 * Compute rotation between two vectors.
 * @static
 * @param {og.Vec3} u - First vector.
 * @param {og.Vec3} v - Second vector.
 * @returns {og.Quat} -
 */
Quat.getRotationBetweenVectors = function (u, v) {
    var w = u.cross(v);
    var q = new Quat(w.x, w.y, w.z, 1.0 + u.dot(v));
    return q.normalize();
};

/**
 * Compute rotation between two vectors with around vector up 
 * for exactly opposite vectors. If vectors exaclty in the same
 * direction than returns identity Quat.
 * @static
 * @param {og.Vec3} source - First vector.
 * @param {og.Vec3} dest - Second vector.
 * @param {og.Vec3} up - Up vector.
 * @returns {og.Quat} -
 */
Quat.getRotationBetweenVectorsUp = function (source, dest, up) {
    var dot = source.dot(dest);
    if (Math.abs(dot + 1.0) < 0.000001) {
        // vector source and dest point exactly in the opposite direction, 
        // so it is a 180 degrees turn around the up-axis
        return Quat.axisAngleToQuat(up, Math.PI);
    }
    if (Math.abs(dot - 1.0) < 0.000001) {
        // vector source and dest point exactly in the same direction
        // so we return the identity Quat
        return new Quat(0, 0, 0, 1);
    }
    var rotAngle = Math.acos(dot);
    var rotAxis = source.cross(dest).normalize();
    return Quat.axisAngleToQuat(rotAxis, rotAngle);
};

/**
 * Clear Quat. Sets zeroes.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.clear = function () {
    this.x = this.y = this.z = this.w = 0;
    return this;
};

/**
 * Sets Quat values.
 * @public
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 * @returns {og.Quat} -
 */
Quat.prototype.set = function (x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
};

/**
 * Copy Quat values.
 * @public
 * @param {og.Quat} q - Copy Quat.
 * @returns {og.Quat} -
 */
Quat.prototype.copy = function (q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
};

/**
 * Set current Quat instance to identity Quat.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.setIdentity = function () {
    this.x = 0.0;
    this.y = 0.0;
    this.z = 0.0;
    this.w = 1.0;
    return this;
};

/**
 * Duplicates a Quat instance.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.clone = function () {
    return new Quat(this.x, this.y, this.z, this.w);
};

/**
 * Computes the componentwise sum of two Quats.
 * @public
 * @param {og.Quat} q - Quat to add.
 * @returns {og.Quat} -
 */
Quat.prototype.add = function (q) {
    return new Quat(this.x + q.x, this.y + q.y, this.z + q.z, this.w + q.w);
};

/**
 * Computes the componentwise difference of two Quats.
 * @public
 * @param {og.Quat} q - Quat to subtract.
 * @returns {og.Quat} -
 */
Quat.prototype.sub = function (q) {
    return new Quat(this.x - q.x, this.y - q.y, this.z - q.z, this.w - q.w);
};

/**
 * Multiplies the provided Quat componentwise by the provided scalar.
 * @public
 * @param {Number} scale - The scalar to multiply with.
 * @returns {og.Quat} -
 */
Quat.prototype.scaleTo = function (scale) {
    return new Quat(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
};

/**
 * Converts Quat values to array.
 * @public
 * @returns {Array.<number,number,number,number>} -
 */
Quat.prototype.toVec = function () {
    return [this.x, this.y, this.z, this.w];
};

/**
 * Sets current quaternion by spherical coordinates.
 * @public
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {number} angle - Angle in radians.
 * @returns {og.Quat} -
 */
Quat.prototype.setFromSphericalCoords = function (lat, lon, angle) {
    var sin_a = Math.sin(angle / 2);
    var cos_a = Math.cos(angle / 2);
    var sin_lat = Math.sin(lat);
    var cos_lat = Math.cos(lat);
    var sin_long = Math.sin(lon);
    var cos_long = Math.cos(lon);
    this.x = sin_a * cos_lat * sin_long;
    this.y = sin_a * sin_lat;
    this.z = sin_a * sin_lat * cos_long;
    this.w = cos_a;
    return this;
};

/**
 * Gets spherical coordinates.
 * @public
 * @returns {Object} Returns object with latitude, longitude and alpha. 
 */
Quat.prototype.toSphericalCoords = function () {
    var cos_a = this.w;
    var sin_a = Math.sqrt(1.0 - cos_a * cos_a);
    var angle = Math.acos(cos_a) * 2;
    if (Math.abs(sin_a) < 0.0005)
        sin_a = 1;
    var tx = this.x / sin_a;
    var ty = this.y / sin_a;
    var tz = this.z / sin_a;

    var lon, lat = -Math.asin(ty);
    if (tx * tx + tz * tz < 0.0005)
        lon = 0;
    else
        lon = Math.atan2(tx, tz);
    if (lon < 0)
        lon += 360.0;

    return { lat: lat, lon: lon, alpha: Math.acos(cos_a) };
};

/**
 * Sets current Quat representing a rotation around an axis.
 * @public
 * @param {og.Vec3} axis - The axis of rotation.
 * @param {number} angle The angle in radians to rotate around the axis.
 * @returns {og.Quat} -
 */
Quat.prototype.setFromAxisAngle = function (axis, angle) {
    var v = axis.normal();
    var half_angle = angle * 0.5;
    var sin_a = Math.sin(half_angle);
    this.set(v.x * sin_a, v.y * sin_a, v.z * sin_a, Math.cos(half_angle));
    return this;
};

/**
 * Returns axis and angle of the current Quat.
 * @public
 * @returns {Object} -
 */
Quat.prototype.getAxisAngle = function () {
    var vl = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    var axis, angle;
    if (vl > 0.0000001) {
        var ivl = 1.0 / vl;
        axis = new Vec3(x * ivl, y * ivl, z * ivl);
        if (this.w < 0)
            angle = 2.0 * Math.atan2(-vl, -w); //-PI,0 
        else
            angle = 2.0 * Math.atan2(vl, w); //0,PI 
    } else {
        axis = new Vec3(0, 0, 0);
        angle = 0;
    }
    return { axis: axis, angle: angle };
};

/**
 * Sets current Quat by Euler's angles.
 * @public
 * @param {number} pitch - Pitch angle in degrees.
 * @param {number} yaw - Yaw angle in degrees.
 * @param {number} roll - Roll angle in degrees.
 * @returns {og.Quat} -
 */
Quat.prototype.setFromEulerAngles = function (pitch, yaw, roll) {
    var ex = pitch * math.RADIANS_HALF,
        ey = yaw * mathRADIANS_HALF,
        ez = roll * math.RADIANS_HALF;

    var cr = Math.cos(ex),
        cp = Math.cos(ey),
        cy = Math.cos(ez);

    var sr = Math.sin(ex),
        sp = Math.sin(ey),
        sy = Math.sin(ez);

    var cpcy = cp * cy,
        spsy = sp * sy;

    this.w = cr * cpcy + sr * spsy;
    this.x = sr * cpcy - cr * spsy;
    this.y = cr * sp * cy + sr * cp * sy;
    this.z = cr * cp * sy - sr * sp * cy;

    return this.normalize();
};

/**
 * Returns Euler's angles of the current Quat.
 * @public
 * @returns {Object} -
 */
Quat.prototype.getEulerAngles = function () {
    var matrix = this.getMat4();
    return matrix.getEulerAngles();
};

/**
 * Computes a Quat from the provided 4x4 matrix instance.
 * @public
 * @param {og.Mat4} m - The rotation matrix.
 * @returns {og.Quat} -
 */
Quat.prototype.setFromMatrix4 = function (m) {
    var tr, s, q = [];
    var i, j, k;
    m = m._m;

    var nxt = [1, 2, 0];

    tr = m[0] + m[5] + m[10];

    if (tr > 0.0) {
        s = Math.sqrt(tr + 1.0);
        this.w = s / 2.0;
        s = 0.5 / s;
        this.x = (m[6] - m[9]) * s;
        this.y = (m[8] - m[2]) * s;
        this.z = (m[1] - m[4]) * s;
    } else {
        i = 0;
        if (m[5] > m[0]) i = 1;
        if (m[10] > m[i * 5]) i = 2;
        j = nxt[i];
        k = nxt[j];

        s = Math.sqrt((m[i * 5] - (m[j * 5] + m[k * 5])) + 1.0);

        q[i] = s * 0.5;

        if (s !== 0.0) s = 0.5 / s;

        q[3] = (m[j * 4 + k] - m[k * 4 + j]) * s;
        q[j] = (m[i * 4 + j] + m[j * 4 + i]) * s;
        q[k] = (m[i * 4 + k] + m[k * 4 + i]) * s;

        this.x = q[0];
        this.y = q[1];
        this.z = q[2];
        this.w = q[3];
    }
    return this;
};

/**
 * Converts current Quat to the rotation 4x4 matrix.
 * @public
 * @returns {og.Mat4} -
 */
Quat.prototype.getMat4 = function () {
    var m = new Mat4();
    var mx = m._m;
    var c = this.x,
        d = this.y,
        e = this.z,
        g = this.w,
        f = c + c,
        h = d + d,
        i = e + e,
        j = c * f,
        k = c * h;

    c = c * i;

    var l = d * h;

    d = d * i;
    e = e * i;
    f = g * f;
    h = g * h;
    g = g * i;

    mx[0] = 1 - (l + e); mx[1] = k - g; mx[2] = c + h; mx[3] = 0;
    mx[4] = k + g; mx[5] = 1 - (j + e); mx[6] = d - f; mx[7] = 0;
    mx[8] = c - h; mx[9] = d + f; mx[10] = 1 - (j + l); mx[11] = 0;
    mx[12] = 0; mx[13] = 0; mx[14] = 0; mx[15] = 1;

    return m;
};

/**
 * Converts current Quat to the rotation 3x3 matrix.
 * @public
 * @returns {og.Mat3} -
 * @todo NOT TESTED
 */
Quat.prototype.getMat3 = function () {
    var m = new Mat3();
    var mx = m._m;
    var c = this.x,
        d = this.y,
        e = this.z,
        g = this.w,
        f = c + c,
        h = d + d,
        i = e + e,
        j = c * f,
        k = c * h;

    c = c * i;

    var l = d * h;

    d = d * i;
    e = e * i;
    f = g * f;
    h = g * h;
    g = g * i;

    mx[0] = 1 - (l + e); mx[1] = k - g; mx[2] = c + h;
    mx[3] = k + g; mx[4] = 1 - (j + e); mx[5] = d - f;
    mx[6] = c - h; mx[7] = d + f; mx[8] = 1 - (j + l);

    return m;
};

/**
 * Returns quatrenion and vector production.
 * @public
 * @param {og.Vec3} v - 3d Vector.
 * @returns {og.Vec3} -
 */
Quat.prototype.mulVec3 = function (v) {
    var d = v.x, e = v.y, g = v.z;
    var b = this.x, f = this.y, h = this.z, a = this.w;
    var i = a * d + f * g - h * e,
        j = a * e + h * d - b * g,
        k = a * g + b * e - f * d;
    d = -b * d - f * e - h * g;
    return new Vec3(
        i * a + d * -b + j * -h - k * -f,
        j * a + d * -f + k * -b - i * -h,
        k * a + d * -h + i * -f - j * -b);
};

/**
 * Computes the product of two Quats.
 * @public
 * @param {og.Quat} q - Quat to multiply.
 * @returns {og.Quat} -
 */
Quat.prototype.mul = function (q) {
    var d = this.x, e = this.y, g = this.z, a = this.w;
    var f = q.x, h = q.y, i = q.z, b = q.w;
    return new Quat(
        d * b + a * f + e * i - g * h,
        e * b + a * h + g * f - d * i,
        g * b + a * i + d * h - e * f,
        a * b - d * f - e * h - g * i);
};

/**
 * Gets the conjugate of the Quat.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.conjugate = function () {
    return new Quat(-this.x, -this.y, -this.z, this.w);
};

/** 
 * Computes the inverse of the Quat.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.inverse = function () {
    var n = 1 / this.magnitude2();
    return new Quat(-this.x * n, -this.y * n, -this.z * n, this.w * n);
};

/**
 * Computes a magnitude of the Quat.
 * @public
 * @returns {number} -
 */
Quat.prototype.magnitude = function () {
    var b = this.x, c = this.y, d = this.z, a = this.w;
    return Math.sqrt(b * b + c * c + d * d + a * a);
};

/**
 * Computes a squared magnitude of the Quat.
 * @public
 * @returns {number} -
 */
Quat.prototype.magnitude2 = function () {
    var b = this.x, c = this.y, d = this.z, a = this.w;
    return b * b + c * c + d * d + a * a;
};

/**
 * Computes the dot (scalar) product of two Quats.
 * @public
 * @param {og.Quat} q - Second quatrnion.
 * @returns {number} -
 */
Quat.prototype.dot = function (q) {
    return this.x * q.x + this.y * q.y + this.z * q.z;
};

/**
 * Current Quat normalization.
 * @public
 * @returns {og.Quat} -
 */
Quat.prototype.normalize = function () {
    var c = this.x, d = this.y, e = this.z, g = this.w,
        f = Math.sqrt(c * c + d * d + e * e + g * g);
    if (f === 0.0) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
        return this;
    }
    f = 1 / f;
    this.x = c * f;
    this.y = d * f;
    this.z = e * f;
    this.w = g * f;
    return this;
};

/**
 * Compares two Quats.
 * @public
 * @param {og.Quat} q - Second quatrnion.
 * @returns {Boolean} -
 */
Quat.prototype.isEqual = function (q) {
    var matching = this.dot(q);
    if (Math.abs(matching - 1.0) < 0.001) {
        return true;
    }
    return false;
};

/**
 * Performs a spherical linear interpolation between two Quats.
 * @public
 * @param {og.Quat} b - The end rotation Quat.
 * @param {number} t - interpolation amount between the two Quats.
 * @returns {og.Quat} -
 */
Quat.prototype.slerp = function (b, t) {

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bx = b.x, by = b.y, bz = b.z, bw = b.w;

    var omega, cosom, sinom, scale0, scale1;

    cosom = ax * bx + ay * by + az * bz + aw * bw;

    if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }

    if ((1.0 - cosom) > 0.000001) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1.0 - t;
        scale1 = t;
    }

    return new Quat(
        scale0 * ax + scale1 * bx,
        scale0 * ay + scale1 * by,
        scale0 * az + scale1 * bz,
        scale0 * aw + scale1 * bw
    );
};

/**
 * Returns a roll angle in radians.
 * @public
 * @param {Boolean} [reprojectAxis] -
 * @returns {Number} -
 */
Quat.prototype.getRoll = function (reprojectAxis) {
    var x = this.x, y = this.y, z = this.z, w = this.w;
    if (reprojectAxis) {
        var fTy = 2.0 * y;
        var fTz = 2.0 * z;
        var fTwz = fTz * w;
        var fTxy = fTy * x;
        var fTyy = fTy * y;
        var fTzz = fTz * z;
        return Math.atan2(fTxy + fTwz, 1.0 - (fTyy + fTzz));
    } else {
        return Math.atan2(2 * (x * y + w * z), w * w + x * x - y * y - z * z);
    }
};

/**
 * Returns a pitch angle in radians.
 * @public
 * @param {Boolean} [reprojectAxis] -
 * @returns {number} -
 */
Quat.prototype.getPitch = function (reprojectAxis) {
    var x = this.x, y = this.y, z = this.z, w = this.w;
    if (reprojectAxis) {
        var fTx = 2.0 * x;
        var fTz = 2.0 * z;
        var fTwx = fTx * w;
        var fTxx = fTx * x;
        var fTyz = fTz * y;
        var fTzz = fTz * z;
        return Math.atan2(fTyz + fTwx, 1.0 - (fTxx + fTzz));
    } else {
        return Math.atan2(2 * (y * z + w * x), w * w - x * x - y * y + z * z);
    }
};

/**
 * Returns a yaw angle in radians.
 * @public
 * @param {Boolean} [reprojectAxis] -
 * @returns {number} -
 */
Quat.prototype.getYaw = function (reprojectAxis) {
    var x = this.x, y = this.y, z = this.z, w = this.w;
    if (reprojectAxis) {
        var fTx = 2.0 * x;
        var fTy = 2.0 * y;
        var fTz = 2.0 * z;
        var fTwy = fTy * w;
        var fTxx = fTx * x;
        var fTxz = fTz * x;
        var fTyy = fTy * y;
        return Math.atan2(fTxz + fTwy, 1.0 - (fTxx + fTyy));
    } else {
        return Math.asin(-2 * (x * z - w * y));
    }
};

export { Quat };