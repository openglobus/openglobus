goog.provide('og.math.Quaternion');

goog.require('og.math');
goog.require('og.math.Matrix4');

og.math.Quaternion = function (x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
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

og.math.Quaternion.prototype.toVec = function () {
    var x = new og.math.GLArray(4);
    x[0] = this.x;
    x[1] = this.y;
    x[2] = this.z;
    x[3] = this.w;
    return x;
};

/**
 * Convertion from sherical coordinates to quaternion
 */
og.math.Quaternion.prototype.sphericalToQuat = function (lat, lon, angle) {
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

og.math.Quaternion.prototype.axisAngleToQuat = function (axis, angle) {
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

og.math.Quaternion.prototype.eulerToQuat = function (pitch, yaw, roll) {
    var ex, ey, ez;
    var cr, cp, cy, sr, sp, sy, cpcy, spsy;

    ex = x * og.Math.RADIANS / 2.0;
    ey = y * og.Math.RADIANS / 2.0;
    ez = z * og.Math.RADIANS / 2.0;

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

og.math.Quaternion.prototype.matrix4ToQuat = function (m) {
    var tr, s, q = new Float32Array(4);
    var i, j, k;

    var nxt = [1, 2, 0];

    tr = m._m[0] + m._m[5] + m._m[10];

    if (tr > 0.0) {
        s = Math.sqrt(tr + 1.0);
        this.w = s / 2.0;
        s = 0.5 / s;
        this.x = (m._m[6] - m._m[9]) * s;
        this.y = (m._m[8] - m._m[2]) * s;
        this.z = (m._m[1] - m._m[4]) * s;
    }
    else {
        i = 0;
        if (m[5] > m[0]) i = 1;
        if (m[10] > m[i * 5]) i = 2;
        j = nxt[i];
        k = nxt[j];

        s = sqrt((m[i * 5] - (m[j * 5] + m[k * 5])) + 1.0);

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

og.math.Quaternion.protoype.mulVec3 = function (v) {
    var d = v.x, e = v.y, g = v.z;
    var b = this.x, f = this.y, h = this.z, a = this.w;
    var i = a * d + f * g - h * e,
        j = a * e + h * d - b * g,
        k = a * g + b * e - f * d;
    d = -b * d - f * e - h * g;
    return new og.math.Quaternion(
        i * a + d * -b + j * -h - k * -f,
        j * a + d * -f + k * -b - i * -h,
        k * a + d * -h + i * -f - j * -b);
};

og.math.Quaternion.protoype.mul = function (q) {
    var d = this.x, e = this.y, g = this.z, a = this.w;
    var f = q.x, h = q.y, i = q.z, b = q.w;
    return new og.math.Quaternion(
        d * b + a * f + e * i - g * h,
        e * b + a * h + g * f - d * i,
        g * b + a * i + d * h - e * f,
        a * b - d * f - e * h - g * i);
};

og.math.Quaternion.protoype.mul_v2 = function (q) {
    var a = (this.w + this.x) * (q.w + q.x),
        b = (this.z - this.y) * (q.y - q.z),
        c = (this.x - this.w) * (q.y + q.z),
        d = (this.y + this.z) * (q.x - q.w),
        e = (this.x + this.z) * (q.x + q.y),
        f = (this.x - this.z) * (q.x - q.y),
        g = (this.w + this.y) * (q.w - q.z),
        h = (this.w - this.y) * (q.w + q.z);
    return new og.math.Quaternion(
        a - (e + f + g + h) * 0.5,
        -c + (e - f + g - h) * 0.5,
        -d + (e - f - g + h) * 0.5,
        b + (-e - f + g + h) * 0.5);
};

og.math.Quaternion.protoype.conjugate = function () {
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

//normalize
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

og.math.Quaternion.prototype.slerp = function () {
    var e = c;
    if (this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w < 0)
        e = -1 * c;
    this.x = 1 - c * this.x + e * b.x;
    this.y = 1 - c * this.y + e * b.y;
    this.z = 1 - c * this.z + e * b.z;
    this.w = 1 - c * this.w + e * b.w;
    return this;
};