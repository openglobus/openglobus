goog.provide('og.math.Quaternion');

goog.require('og.math');
goog.require('og.math.Matrix4');

og.math.Quaternion = function (x, y, z, w) {
    this.x = x || 0.0;
    this.y = y || 0.0;
    this.z = z || 0.0;
    this.w = w || 0.0;
};

og.math.Quaternion.IDENTITY = new og.math.Quaternion(0.0, 0.0, 0.0, 1.0);

og.math.Quaternion.xRotation = function (a) {
    a *= 0.5;
    return new og.math.Quaternion(Math.sin(a), 0.0, 0.0, Math.cos(a));
};

og.math.Quaternion.yRotation = function (a) {
    a *= 0.5;
    return new og.math.Quaternion(0.0, Math.sin(a), 0.0, Math.cos(a));
};

og.math.Quaternion.zRotation = function (a) {
    a *= 0.5;
    return new og.math.Quaternion(0.0, 0.0, Math.sin(a), Math.cos(a));
};

og.math.Quaternion.prototype.clear = function () {
    this.x = this.y = this.z = this.w = 0;
    return this;
};

og.math.Quaternion.prototype.set = function (x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
};

og.math.Quaternion.prototype.copy = function (q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
};

og.math.Quaternion.prototype.clone = function () {
    return new og.math.Quaternion(this.x, this.y, this.z, this.w);
};

og.math.Quaternion.prototype.add = function (q) {
    return new og.math.Quaternion(this.x + q.x, this.y + q.y, this.z + q.z, this.w + q.w);
};

og.math.Quaternion.prototype.sub = function (q) {
    return new og.math.Quaternion(this.x - q.x, this.y - q.y, this.z - q.z, this.w - q.w);
};

og.math.Quaternion.prototype.scaleTo = function (scale) {
    return new og.math.Quaternion(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
};

og.math.Quaternion.prototype.toVec = function () {
    var x = new og.math.GLArray(4);
    x[0] = this.x;
    x[1] = this.y;
    x[2] = this.z;
    x[3] = this.w;
    return x;
};

og.math.Quaternion.prototype.setFromSphericalCoords = function (lat, lon, angle) {
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

og.math.Quaternion.prototype.toSphericalCoords = function () {
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

    return { lat: lat, lon: lon };
};


og.math.Quaternion.axisAngleToQuat = function (axis, angle) {
    var res = new og.math.Quaternion();
    var v = axis.normal();
    var half_angle = angle * 0.5;
    var sin_a = Math.sin(half_angle);
    res.set(v.x * sin_a, v.y * sin_a, v.z * sin_a, Math.cos(half_angle));
    return res;
};

og.math.Quaternion.prototype.setFromAxisAngle = function (axis, angle) {
    var v = axis.normal();
    var half_angle = angle * 0.5;
    var sin_a = Math.sin(half_angle);
    this.set(v.x * sin_a, v.y * sin_a, v.z * sin_a, Math.cos(half_angle));
    return this;
};

og.math.Quaternion.prototype.getAxisAngle = function () {
    var vl = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    var axis, angle;
    if (vl > 0.0000001) {
        var ivl = 1.0 / vl;
        axis = new og.math.Vector3(x * ivl, y * ivl, z * ivl);
        if (this.w < 0)
            angle = 2.0 * Math.atan2(-vl, -w); //-PI,0 
        else
            angle = 2.0 * Math.atan2(vl, w); //0,PI 
    } else {
        axis = new og.math.Vector3(0, 0, 0);
        angle = 0;
    }
    return { axis: axis, angle: angle };
};

og.math.Quaternion.prototype.setFromEulerAngles = function (pitch, yaw, roll) {
    var ex, ey, ez;
    var cr, cp, cy, sr, sp, sy, cpcy, spsy;

    ex = pitch * og.math.RADIANS / 2.0;
    ey = yaw * og.math.RADIANS / 2.0;
    ez = roll * og.math.RADIANS / 2.0;

    cr = Math.cos(ex);
    cp = Math.cos(ey);
    cy = Math.cos(ez);

    sr = Math.sin(ex);
    sp = Math.sin(ey);
    sy = Math.sin(ez);

    cpcy = cp * cy;
    spsy = sp * sy;

    this.w = cr * cpcy + sr * spsy;
    this.x = sr * cpcy - cr * spsy;
    this.y = cr * sp * cy + sr * cp * sy;
    this.z = cr * cp * sy - sr * sp * cy;

    return this.normalize();
};

og.math.Quaternion.prototype.getEulerAngles = function () {
    var matrix = this.getMatrix4();
    return matrix.getEulerAngles();
};

og.math.Quaternion.prototype.setFromMatrix4 = function (m) {
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

        if (s != 0.0) s = 0.5 / s;

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

og.math.Quaternion.prototype.getMatrix4 = function () {
    var m = new og.math.Matrix4();
    var mx = m._m;
    var c = this.x, d = this.y, e = this.z, g = this.w, f = c + c, h = d + d, i = e + e, j = c * f, k = c * h;
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

og.math.Quaternion.prototype.mulVec3 = function (v) {
    var d = v.x, e = v.y, g = v.z;
    var b = this.x, f = this.y, h = this.z, a = this.w;
    var i = a * d + f * g - h * e,
        j = a * e + h * d - b * g,
        k = a * g + b * e - f * d;
    d = -b * d - f * e - h * g;
    return new og.math.Vector3(
        i * a + d * -b + j * -h - k * -f,
        j * a + d * -f + k * -b - i * -h,
        k * a + d * -h + i * -f - j * -b);
};

og.math.Quaternion.prototype.mul = function (q) {
    var d = this.x, e = this.y, g = this.z, a = this.w;
    var f = q.x, h = q.y, i = q.z, b = q.w;
    return new og.math.Quaternion(
        d * b + a * f + e * i - g * h,
        e * b + a * h + g * f - d * i,
        g * b + a * i + d * h - e * f,
        a * b - d * f - e * h - g * i);
};

//og.math.Quaternion.prototype.mul_v2 = function (q) {
//    var a = (this.w + this.x) * (q.w + q.x),
//        b = (this.z - this.y) * (q.y - q.z),
//        c = (this.x - this.w) * (q.y + q.z),
//        d = (this.y + this.z) * (q.x - q.w),
//        e = (this.x + this.z) * (q.x + q.y),
//        f = (this.x - this.z) * (q.x - q.y),
//        g = (this.w + this.y) * (q.w - q.z),
//        h = (this.w - this.y) * (q.w + q.z);
//    return new og.math.Quaternion(
//        a - (e + f + g + h) * 0.5,
//        -c + (e - f + g - h) * 0.5,
//        -d + (e - f - g + h) * 0.5,
//        b + (-e - f + g + h) * 0.5);
//};

og.math.Quaternion.prototype.conjugate = function () {
    return new og.math.Quaternion(-this.x, -this.y, -this.z, this.w);
};

og.math.Quaternion.prototype.inverse = function () {
    var n = 1 / this.norm2();
    return new og.math.Quaternion(-this.x * n, -this.y * n, -this.z * n, this.w * n);
};

//magnitude
og.math.Quaternion.prototype.norm = function () {
    var b = this.x, c = this.y, d = this.z, a = this.w;
    return Math.sqrt(b * b + c * c + d * d + a * a);
};

//norm
og.math.Quaternion.prototype.norm2 = function () {
    var b = this.x, c = this.y, d = this.z, a = this.w;
    return b * b + c * c + d * d + a * a;
};

og.math.Quaternion.prototype.dot = function (q) {
    return this.x * q.x + this.y * q.y + this.z * q.z;
};

og.math.Quaternion.prototype.normalize = function () {
    var c = this.x, d = this.y, e = this.z, g = this.w,
        f = Math.sqrt(c * c + d * d + e * e + g * g);
    if (f == 0) {
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

og.math.Quaternion.prototype.isEqual = function (q) {
    var matching = this.dot(q);
    if (Math.abs(matching - 1.0) < 0.001) {
        return true;
    }
    return false;
};

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {og.math.Quaternion} b the end rotation
 * @param {Number} t interpolation amount between the two quaternions
 * @returns {og.math.Quaternion}
 */
og.math.Quaternion.prototype.slerp = function (b, t) {

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

    return new og.math.Quaternion(
        scale0 * ax + scale1 * bx,
        scale0 * ay + scale1 * by,
        scale0 * az + scale1 * bz,
        scale0 * aw + scale1 * bw
    );
};

og.math.Quaternion.getLookAtTargetUp = function (target, up) {
    var forward = target.normal();
    forward = og.math.Vector3.OrthoNormalize(up, forward); // Keeps up the same, make forward orthogonal to up
    var right = up.cross(forward);
    var ret = new og.math.Quaternion();
    ret.w = Math.sqrt(1.0 + right.x + up.y + forward.z) * 0.5;
    var w4_recip = 1.0 / (4.0 * ret.w);
    ret.x = (forward.y - up.z) * w4_recip;
    ret.y = (right.z - forward.x) * w4_recip;
    ret.z = (up.x - right.y) * w4_recip;
    return ret;
};

og.math.Quaternion.getLookAtSourceDest = function (sourcePoint, destPoint) {
    var forwardVector = destPoint.subA(sourcePoint).normalize();
    var dot = og.math.Vector3.FORWARD.dot(forwardVector);
    if (Math.abs(dot - (-1.0)) < 0.000001) {
        return og.math.Quaternion.axisAngleToQuat(og.math.Vector3.UP, Math.PI);
    }
    if (Math.abs(dot - (1.0)) < 0.000001) {
        return new og.math.Quaternion(0, 0, 0, 1);
    }
    var rotAngle = Math.acos(dot);
    var rotAxis = og.math.Vector3.FORWARD.cross(forwardVector).normalize();
    return og.math.Quaternion.axisAngleToQuat(rotAxis, rotAngle);
};


//SEEMS NOT TO BE WORKABLE
//og.math.Quaternion.getRotationBetweenVectors = function (u, v) {
//    var k_cos_theta = u.dot(v);
//    var k = Math.sqrt(u.length2() * v.length2());
//    if (k_cos_theta / k == -1) {
//        // 180 degree rotation around any orthogonal vector
//        var other = u.dot(og.math.Vector3.RIGHT) < 1.0 ? new og.math.Vector3(1, 0, 0) : new og.math.Vector3(0, 1, 0);
//        return og.math.Quaternion.axisAngleToQuat(u.cross(other).normalize(), Math.PI);
//    }
//    return og.math.Quaternion.axisAngleToQuat(u.cross(v).normalize(), k_cos_theta + k).normalize();
//};

//og.math.Quaternion.getRotationBetweenVectors2 = function (start, dest) {
//    var cosTheta = start.dot(dest);
//    var rotationAxis;
//    if (cosTheta < -1 + 0.001) {
//        // special case when vectors in opposite directions:
//        // there is no "ideal" rotation axis
//        // So guess one; any will do as long as it's perpendicular to start
//        rotationAxis = og.math.Vector3.BACKWARD.cross(start);
//        if (rotationAxis.length2() < 0.01)// bad luck, they were parallel, try again!
//            rotationAxis = og.math.Vector3.RIGHT.cross(start);
//        return og.math.Quaternion.axisAngleToQuat(rotationAxis.normalize(), Math.PI);
//    }
//    rotationAxis = start.cross(dest);
//    var s = Math.sqrt((1 + cosTheta) * 2);
//    var invs = 1 / s;
//    return new og.math.Quaternion(rotationAxis.x * invs, rotationAxis.y * invs, rotationAxis.z * invs, s * 0.5);
//};

og.math.Quaternion.getRotationBetweenVectors = function (u, v) {
    var w = u.cross(v);
    var q = new og.math.Quaternion(w.x, w.y, w.z, 1.0 + u.dot(v));
    return q.normalize();
};

//og.math.Quaternion.getRotationBetweenVectorsUp = function (source, dest, up) {
//    var dot = source.dot(dest);
//    if (Math.abs(dot - (-1.0)) < 0.000001) {
//        // vector a and b point exactly in the opposite direction, 
//        // so it is a 180 degrees turn around the up-axis
//        return og.math.Quaternion.axisAngleToQuat(up, Math.PI);
//    }
//    if (Math.abs(dot - (1.0)) < 0.000001) {
//        // vector a and b point exactly in the same direction
//        // so we return the identity quaternion
//        return new og.math.Quaternion(0, 0, 0, 1);
//    }
//    var rotAngle = Math.acos(dot);
//    var rotAxis = source.cross(dest).normalize();
//    return og.math.Quaternion.axisAngleToQuat(rotAxis, rotAngle);
//};

og.math.Quaternion.prototype.getRoll = function (reprojectAxis) {
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

og.math.Quaternion.prototype.getPitch = function (reprojectAxis) {
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

og.math.Quaternion.prototype.getYaw = function (reprojectAxis) {
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