goog.provide('og.math.Matrix4');

goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Vector4');

og.math.Matrix4 = function () {
    this._m = new Array(16);
};

og.math.Matrix4.prototype.set = function (m) {
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

og.math.Matrix4.prototype.clone = function () {
    var res = new og.math.Matrix4();
    res.set(this);
    return res;
};

og.math.Matrix4.prototype.copy = function (a) {
    this.set(a._m);
};

og.math.Matrix4.prototype.mulVec3 = function (p) {
    return new og.math.Vector3(
        this._m[0] * p.x + this._m[4] * p.y + this._m[8] * p.z + this._m[12],
        this._m[1] * p.x + this._m[5] * p.y + this._m[9] * p.z + this._m[13],
        this._m[2] * p.x + this._m[6] * p.y + this._m[10] * p.z + this._m[14]
    );
};

og.math.Matrix4.prototype.mulVec4 = function (p) {
    var d = p.x, e = p.y, g = p.z, f = p.w;
    return new og.math.Vector4(
        this._m[0] * d + this._m[4] * e + this._m[8] * g + this._m[12] * f,
        this._m[1] * d + this._m[5] * e + this._m[9] * g + this._m[13] * f,
        this._m[2] * d + this._m[6] * e + this._m[10] * g + this._m[14] * f,
        this._m[3] * d + this._m[7] * e + this._m[11] * g + this._m[15] * f
    );
};

og.math.Matrix4.prototype.inverse = function () {
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
        res = new og.math.Matrix4();

    res._m[0] = (h * E - i * D + j * C) * q; res._m[1] = (-d * E + e * D - g * C) * q; res._m[2] = (p * w - r * v + s * u) * q; res._m[3] = (-l * w + o * v - m * u) * q;
    res._m[4] = (-f * E + i * z - j * y) * q; res._m[5] = (c * E - e * z + g * y) * q; res._m[6] = (-n * w + r * t - s * B) * q; res._m[7] = (k * w - o * t + m * B) * q;
    res._m[8] = (f * D - h * z + j * x) * q; res._m[9] = (-c * D + d * z - g * x) * q; res._m[10] = (n * v - p * t + s * A) * q; res._m[11] = (-k * v + l * t - m * A) * q;
    res._m[12] = (-f * C + h * y - i * x) * q; res._m[13] = (c * C - d * y + e * x) * q; res._m[14] = (-n * u + p * B - r * A) * q; res._m[15] = (k * u - l * B + o * A) * q;
    return res;
};

og.math.Matrix4.prototype.transpose = function () {
    var res = new og.math.Matrix4();
    res._m[0] = this._m[0]; res._m[1] = this._m[4]; res._m[2] = this._m[8]; res._m[3] = this._m[12];
    res._m[4] = this._m[1]; res._m[5] = this._m[5]; res._m[6] = this._m[9]; res._m[7] = this._m[13];
    res._m[8] = this._m[2]; res._m[9] = this._m[6]; res._m[10] = this._m[10]; res._m[11] = this._m[14];
    res._m[12] = this._m[3]; res._m[13] = this._m[7]; res._m[14] = this._m[11]; res._m[15] = this._m[15];
    return res;
};

og.math.Matrix4.prototype.setIdentity = function () {
    this._m[0] = 1; this._m[1] = 0; this._m[2] = 0; this._m[3] = 0;
    this._m[4] = 0; this._m[5] = 1; this._m[6] = 0; this._m[7] = 0;
    this._m[8] = 0; this._m[9] = 0; this._m[10] = 1; this._m[11] = 0;
    this._m[12] = 0; this._m[13] = 0; this._m[14] = 0; this._m[15] = 1;
    return this;
};

og.math.Matrix4.identity = function () {
    var res = new og.math.Matrix4();
    res._m[0] = 1; res._m[1] = 0; res._m[2] = 0; res._m[3] = 0;
    res._m[4] = 0; res._m[5] = 1; res._m[6] = 0; res._m[7] = 0;
    res._m[8] = 0; res._m[9] = 0; res._m[10] = 1; res._m[11] = 0;
    res._m[12] = 0; res._m[13] = 0; res._m[14] = 0; res._m[15] = 1;
    return res;
};

og.math.Matrix4.prototype.mul = function (mx) {
    var d = this._m[0], e = this._m[1], g = this._m[2], f = this._m[3],
        h = this._m[4], i = this._m[5], j = this._m[6], k = this._m[7],
        l = this._m[8], o = this._m[9], m = this._m[10], n = this._m[11],
        p = this._m[12], r = this._m[13], s = this._m[14]; a = this._m[15];

    var A = mx._m[0], B = mx._m[1], t = mx._m[2], u = mx._m[3],
        v = mx._m[4], w = mx._m[5], x = mx._m[6], y = mx._m[7],
        z = mx._m[8], C = mx._m[9], D = mx._m[10], E = mx._m[11],
        q = mx._m[12], F = mx._m[13], G = mx._m[14]; b = mx._m[15];

    var res = new og.math.Matrix4();
    res._m[0] = A * d + B * h + t * l + u * p; res._m[1] = A * e + B * i + t * o + u * r; res._m[2] = A * g + B * j + t * m + u * s; res._m[3] = A * f + B * k + t * n + u * a;
    res._m[4] = v * d + w * h + x * l + y * p; res._m[5] = v * e + w * i + x * o + y * r; res._m[6] = v * g + w * j + x * m + y * s; res._m[7] = v * f + w * k + x * n + y * a;
    res._m[8] = z * d + C * h + D * l + E * p; res._m[9] = z * e + C * i + D * o + E * r; res._m[10] = z * g + C * j + D * m + E * s; res._m[11] = z * f + C * k + D * n + E * a;
    res._m[12] = q * d + F * h + G * l + b * p; res._m[13] = q * e + F * i + G * o + b * r; res._m[14] = q * g + F * j + G * m + b * s; res._m[15] = q * f + F * k + G * n + b * a;
    return res;
};

og.math.Matrix4.prototype.translate = function (v) {
    var d = v.x, e = v.y, b = v.z;
    var a = this._m;
    a[12] = a[0] * d + a[4] * e + a[8] * b + a[12];
    a[13] = a[1] * d + a[5] * e + a[9] * b + a[13];
    a[14] = a[2] * d + a[6] * e + a[10] * b + a[14];
    a[15] = a[3] * d + a[7] * e + a[11] * b + a[15];
    return this;
};

og.math.Matrix4.prototype.translateToPosition = function (v) {
    var a = this._m;
    a[12] = v.x;
    a[13] = v.y;
    a[14] = v.z;
    return this;
};

og.math.Matrix4.prototype.rotate = function (u, angle) {
    var c = Math.cos(angle),
        s = Math.sin(angle);
    var mx = this._m;
    mx[0] = c + (1 - c) * u.x * u.x; mx[1] = (1 - c) * u.y * u.x - s * u.z; mx[2] = (1 - c) * u.z * u.x + s * u.y; mx[3] = 0;
    mx[4] = (1 - c) * u.x * u.y + s * u.z; mx[5] = c + (1 - c) * u.y * u.y; mx[6] = (1 - c) * u.z * u.y - s * u.x; mx[7] = 0;
    mx[8] = (1 - c) * u.x * u.z - s * u.y; mx[9] = (1 - c) * u.y * u.z + s * u.x; mx[10] = c + (1 - c) * u.z * u.z; mx[11] = 0;
    mx[12] = 0; mx[13] = 0; mx[14] = 0; mx[15] = 1;
    return this;
};

og.math.Matrix4.prototype.scale = function (v) {
    var mx = this._m;
    mx[0] = mx[0] * v.x; mx[1] = mx[1] * v.x; mx[2] = mx[2] * v.x; mx[3] = mx[3] * v.x;
    mx[4] = mx[4] * v.y; mx[5] = mx[5] * v.y; mx[6] = mx[6] * v.y; mx[7] = mx[7] * v.y;
    mx[8] = mx[8] * v.z; mx[9] = mx[9] * v.z; mx[10] = mx[10] * v.z; mx[11] = mx[11] * v.z;
    mx[12] = mx[12]; mx[13] = mx[13]; mx[14] = mx[14]; mx[15] = mx[15];
    return this;
};

og.math.Matrix4.prototype.setFrustum = function (a, b, c, d, e, g) {

    this.right = b;
    this.left = a;
    this.top = d;
    this.bottom = c;
    this.far = g;
    this.near = e;

    var h = b - a, i = d - c, j = g - e;
    this._m[0] = e * 2 / h; this._m[1] = 0; this._m[2] = 0; this._m[3] = 0;
    this._m[4] = 0; this._m[5] = e * 2 / i; this._m[6] = 0; this._m[7] = 0;
    this._m[8] = (b + a) / h; this._m[9] = (d + c) / i; this._m[10] = -(g + e) / j; this._m[11] = -1;
    this._m[12] = 0; this._m[13] = 0; this._m[14] = -(g * e * 2) / j; this._m[15] = 0;
    return this;
};

og.math.Matrix4.prototype.setPerspective = function (angle, aspect, near, far) {
    angle = near * Math.tan(angle * Math.PI / 360);
    aspect = angle * aspect;
    return this.setFrustum(-aspect, aspect, -angle, angle, near, far)
};

og.math.Matrix4.prototype.eulerToMatrix = function (ax, ay, az) {
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
};

og.math.Matrix4.prototype.getEulerAngles = function () {
    var mat = this._m;
    var d, tx, ty;
    var angle_x, angle_z,
        angle_y = d = -Math.asin(mat[2]);
    var c = Math.cos(angle_y);
    angle_y *= og.math.RADIANS;

    //Gimball lock?
    if (Math.abs(c) > 0.005) {
        tx = mat[10] / c;
        ty = -mat[6] / c;

        angle_x = Math.atan2(ty, tx) * og.math.RADIANS;

        tx = mat[0] / c;
        ty = -mat[1] / c;

        angle_z = Math.atan2(ty, tx) * og.math.RADIANS;
    }
    else {
        angle_x = 0;

        tx = mat[5];
        ty = mat[4];

        angle_z = Math.atan2(ty, tx) * og.math.RADIANS;
    }

    return new og.math.Vector3(
        og.math.clamp(angle_x, 0, 360),
        og.math.clamp(angle_y, 0, 360),
        og.math.clamp(angle_z, 0, 360));
};

