'use strict';

import * as math from '../math.js';
import { Mat3 } from './Mat3.js';
import { Mat4 } from './Mat4.js';
import { Vec3 } from './Vec3.js';

/**
 * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
 * @constructor
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 */
export class Quat {

    /**
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     */
    constructor(x, y, z, w) {
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
     * Identity Quat.
     * @const
     * @type {og.Quat}
     */
    static get IDENTITY() {
        return new Quat(0.0, 0.0, 0.0, 1.0);
    }

    /**
     * Returns a Quat represents rotation around X axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {og.Quat} -
     */
    static xRotation(a) {
        a *= 0.5;
        return new Quat(Math.sin(a), 0.0, 0.0, Math.cos(a));
    };

    /**
     * Returns a Quat represents rotation around Y axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {og.Quat} -
     */
    static yRotation(a) {
        a *= 0.5;
        return new Quat(0.0, Math.sin(a), 0.0, Math.cos(a));
    };

    /**
     * Returns a Quat represents rotation around Z axis.
     * @static
     * @param {number} a - The angle in radians to rotate around the axis.
     * @returns {og.Quat} -
     */
    static zRotation(a) {
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
    static axisAngleToQuat(axis, angle) {
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
     * @param {og.Vec3} forward - Heading target coordinates.
     * @param {og.Vec3} up - Up vector.
     * @returns {og.Quat} -
     */
    static getLookRotation(forward, up) {

        var f = forward.normal().negate();
        var s = (up.cross(f)).normalize();
        var u = f.cross(s);

        var z = 1.0 + s.x + u.y + f.z;

        if (z > 0.000001) {
            let fd = 1.0 / (2.0 * Math.sqrt(z));
            return new Quat(
                (f.y - u.z) * fd,
                (s.z - f.x) * fd,
                (u.x - s.y) * fd,
                0.25 / fd
            );
        }

        if (s.x > u.y && s.x > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + s.x - u.y - f.z));
            return new Quat(
                0.25 / fd,
                (u.x + s.y) * fd,
                (s.z + f.x) * fd,
                (f.y - u.z) * fd
            );
        }

        if (u.y > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + u.y - s.x - f.z));
            return new Quat(
                (u.x + s.y) * fd,
                0.25 / fd,
                (f.y + u.z) * fd,
                (s.z - f.x) * fd
            );
        }

        let fd = 1.0 / (2.0 * Math.sqrt(1.0 + f.z - s.x - u.y));
        return new Quat(
            (s.z + f.x) * fd,
            (f.y + u.z) * fd,
            0.25 / fd,
            (u.x - s.y) * fd
        );
    };

    /**
     * Computes a Quat from from source point heading to the destination point.
     * @static
     * @param {og.Vec3} sourcePoint - Source coordinate.
     * @param {og.Vec3} destPoint - Destination coordinate.
     * @returns {og.Quat} -
     */
    static getLookAtSourceDest(sourcePoint, destPoint) {
        var forwardVector = destPoint.subA(sourcePoint).normalize();
        var dot = Vec3.FORWARD.dot(forwardVector);
        if (Math.abs(dot - (-1.0)) < 0.000001) {
            return Quat.axisAngleToQuat(Vec3.UP, Math.PI);
        }
        if (Math.abs(dot - (1.0)) < 0.000001) {
            return new Quat(0.0, 0.0, 0.0, 1.0);
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
    static getRotationBetweenVectors(u, v) {
        var w = u.cross(v);
        var q = new Quat(w.x, w.y, w.z, 1.0 + u.dot(v));
        return q.normalize();
    };

    /**
     * Compute rotation between two vectors.
     * @static
     * @param {og.Vec3} u - First vector.
     * @param {og.Vec3} v - Second vector.
     * @param {Quat} res
     * @returns {og.Quat} -
     */
    static getRotationBetweenVectorsRes(u, v, res) {
        var w = u.cross(v);
        res.set(w.x, w.y, w.z, 1.0 + u.dot(v));
        return res.normalize();
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
    static getRotationBetweenVectorsUp(source, dest, up) {
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
     * Returns true if the components are zero.
     * @public
     * @param {og.Quat} q - Quat to subtract.
     * @returns {og.Quat} -
     */
    isZero() {
        return this.x === 0.0 && this.y === 0.0 && this.z === 0.0 && this.w === 0.0;
    };

    /**
     * Clear Quat. Sets zeroes.
     * @public
     * @returns {og.Quat} -
     */
    clear() {
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
    set(x, y, z, w) {
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
    copy(q) {
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
    setIdentity() {
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
    clone() {
        return new Quat(this.x, this.y, this.z, this.w);
    };

    /**
     * Computes the componentwise sum of two Quats.
     * @public
     * @param {og.Quat} q - Quat to add.
     * @returns {og.Quat} -
     */
    add(q) {
        return new Quat(this.x + q.x, this.y + q.y, this.z + q.z, this.w + q.w);
    };

    /**
     * Computes the componentwise difference of two Quats.
     * @public
     * @param {og.Quat} q - Quat to subtract.
     * @returns {og.Quat} -
     */
    sub(q) {
        return new Quat(this.x - q.x, this.y - q.y, this.z - q.z, this.w - q.w);
    };

    /**
     * Multiplies the provided Quat componentwise by the provided scalar.
     * @public
     * @param {Number} scale - The scalar to multiply with.
     * @returns {og.Quat} -
     */
    scaleTo(scale) {
        return new Quat(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
    };

    /**
     * Multiplies the provided Quat componentwise.
     * @public
     * @param {Number} scale - The scalar to multiply with.
     * @returns {og.Quat} -
     */
    scale(scale) {
        this.x *= scale; this.y *= scale; this.z *= scale; this.w *= scale;
        return this;
    };

    /**
     * Converts Quat values to array.
     * @public
     * @returns {Array.<number,number,number,number>} -
     */
    toVec() {
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
    setFromSphericalCoords(lat, lon, angle) {
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
     * Sets rotation with the given heading and up vectors.
     * @static
     * @param {og.Vec3} forward - Heading target coordinates.
     * @param {og.Vec3} up - Up vector.
     * @returns {og.Quat} -
     */
    setLookRotation(forward, up) {

        var f = forward.normal().negate();
        var s = (up.cross(f)).normalize();
        var u = f.cross(s);

        var z = 1.0 + s.x + u.y + f.z;

        if (z > 0.000001) {
            let fd = 1.0 / (2.0 * Math.sqrt(z));
            this.x = (f.y - u.z) * fd;
            this.y = (s.z - f.x) * fd;
            this.z = (u.x - s.y) * fd;
            this.w = 0.25 / fd;
        } else if (s.x > u.y && s.x > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + s.x - u.y - f.z));
            this.x = 0.25 / fd;
            this.y = (u.x + s.y) * fd;
            this.z = (s.z + f.x) * fd;
            this.w = (f.y - u.z) * fd;
        } else if (u.y > f.z) {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + u.y - s.x - f.z));
            this.x = (u.x + s.y) * fd;
            this.y = 0.25 / fd;
            this.z = (f.y + u.z) * fd;
            this.w = (s.z - f.x) * fd;
        } else {
            let fd = 1.0 / (2.0 * Math.sqrt(1.0 + f.z - s.x - u.y));
            this.x = (s.z + f.x) * fd;
            this.y = (f.y + u.z) * fd;
            this.z = 0.25 / fd;
            this.w = (u.x - s.y) * fd;
        }

        return this;
    };

    /**
     * Gets spherical coordinates.
     * @public
     * @returns {Object} Returns object with latitude, longitude and alpha. 
     */
    toSphericalCoords() {
        var cos_a = this.w;
        var sin_a = Math.sqrt(1.0 - cos_a * cos_a);
        // var angle = Math.acos(cos_a) * 2;
        if (Math.abs(sin_a) < 0.0005) {
            sin_a = 1;
        }
        var tx = this.x / sin_a;
        var ty = this.y / sin_a;
        var tz = this.z / sin_a;

        var lon, lat = -Math.asin(ty);
        if (tx * tx + tz * tz < 0.0005) {
            lon = 0;
        } else {
            lon = Math.atan2(tx, tz);
        }
        if (lon < 0) {
            lon += 360.0;
        }

        return { lat: lat, lon: lon, alpha: Math.acos(cos_a) };
    };

    /**
     * Sets current Quat representing a rotation around an axis.
     * @public
     * @param {og.Vec3} axis - The axis of rotation.
     * @param {number} angle The angle in radians to rotate around the axis.
     * @returns {og.Quat} -
     */
    setFromAxisAngle(axis, angle) {
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
    getAxisAngle() {
        var vl = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        var axis, angle;
        if (vl > 0.0000001) {
            var ivl = 1.0 / vl;
            axis = new Vec3(x * ivl, y * ivl, z * ivl);
            if (this.w < 0) {
                angle = 2.0 * Math.atan2(-vl, -w); // -PI,0 
            } else {
                angle = 2.0 * Math.atan2(vl, w); // 0,PI 
            }
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
    setFromEulerAngles(pitch, yaw, roll) {
        var ex = pitch * math.RADIANS_HALF,
            ey = yaw * math.RADIANS_HALF,
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
    getEulerAngles() {

        let x = this.x, y = this.y, z = this.z, w = this.w;

        let sqy = y * y;

        let roll = Math.atan2(2.0 * (w * x + y * z), 1.0 - 2.0 * (x * x + sqy));

        let a = w * y - z * x;

        if (a < -1.0) {
            a = -1.0;
        } else if (a > 1.0) {
            a = 1.0;
        }
        let pitch = Math.asin(2.0 * a);

        let yaw = Math.atan2(2.0 * (w * z + x * y), 1.0 - 2.0 * (sqy + z * z));

        return { roll, pitch, yaw };
    };

    /**
     * Computes a Quat from the provided 4x4 matrix instance.
     * @public
     * @param {og.Mat4} m - The rotation matrix.
     * @returns {og.Quat} -
     */
    setFromMatrix4(m) {
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
    getMat4(out) {
        var xs = this.x + this.x;
        var ys = this.y + this.y;
        var zs = this.z + this.z;
        var wx = this.w * xs;
        var wy = this.w * ys;
        var wz = this.w * zs;
        var xx = this.x * xs;
        var xy = this.x * ys;
        var xz = this.x * zs;
        var yy = this.y * ys;
        var yz = this.y * zs;
        var zz = this.z * zs;
        var m = out || new Mat4();
        return m.set([1 - (yy + zz), xy - wz, xz + wy, 0, xy + wz, 1 - (xx + zz), yz - wx, 0, xz - wy, yz + wx, 1 - (xx + yy), 0, 0, 0, 0, 1]);
    };

    /**
     * Converts current Quat to the rotation 3x3 matrix.
     * @public
     * @returns {og.Mat3} -
     * @todo NOT TESTED
     */
    getMat3() {
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
    mulVec3(v) {

        // t = 2 * cross(q.xyz, v)
        // v' = v + q.w * t + cross(q.xyz, t)

        var d = v.x,
            e = v.y,
            g = v.z;

        var b = this.x,
            f = this.y,
            h = this.z,
            a = this.w;

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
    mul(q) {
        var d = this.x, e = this.y, g = this.z, a = this.w;
        var f = q.x, h = q.y, i = q.z, b = q.w;
        return new Quat(
            d * b + a * f + e * i - g * h,
            e * b + a * h + g * f - d * i,
            g * b + a * i + d * h - e * f,
            a * b - d * f - e * h - g * i);
    };

    /**
     * Computes the product of two Quats.
     * @public
     * @param {og.Quat} q - Quat to multiply.
     * @returns {og.Quat} -
     */
    mulA(q) {
        var d = this.x, e = this.y, g = this.z, a = this.w;
        var f = q.x, h = q.y, i = q.z, b = q.w;
        this.x = d * b + a * f + e * i - g * h;
        this.y = e * b + a * h + g * f - d * i;
        this.z = g * b + a * i + d * h - e * f;
        this.w = a * b - d * f - e * h - g * i;
        return this;
    };

    /**
     * Gets the conjugate of the Quat.
     * @public
     * @returns {og.Quat} -
     */
    conjugate() {
        return new Quat(-this.x, -this.y, -this.z, this.w);
    };

    /** 
     * Computes the inverse of the Quat.
     * @public
     * @returns {og.Quat} -
     */
    inverse() {
        var n = 1 / this.magnitude2();
        return new Quat(-this.x * n, -this.y * n, -this.z * n, this.w * n);
    };

    /**
     * Computes a magnitude of the Quat.
     * @public
     * @returns {number} -
     */
    magnitude() {
        var b = this.x, c = this.y, d = this.z, a = this.w;
        return Math.sqrt(b * b + c * c + d * d + a * a);
    };

    /**
     * Computes a squared magnitude of the Quat.
     * @public
     * @returns {number} -
     */
    magnitude2() {
        var b = this.x, c = this.y, d = this.z, a = this.w;
        return b * b + c * c + d * d + a * a;
    };

    /**
     * Computes the dot (scalar) product of two Quats.
     * @public
     * @param {og.Quat} q - Second quatrnion.
     * @returns {number} -
     */
    dot(q) {
        return this.x * q.x + this.y * q.y + this.z * q.z;
    };

    /**
     * Current Quat normalization.
     * @public
     * @returns {og.Quat} -
     */
    normalize() {
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
    isEqual(q) {
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
    slerp(b, t) {

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
    getRoll(reprojectAxis) {
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
    getPitch(reprojectAxis) {
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
    getYaw(reprojectAxis) {
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

}
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

