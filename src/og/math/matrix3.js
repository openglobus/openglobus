goog.provide('og.math.Matrix3');

goog.require('og.math');
goog.require('og.math.Vector3');

og.math.Matrix3 = function () {
    this._m = new Array(9);
};

og.math.Matrix3.prototype.set = function (m) {
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
};

og.math.Matrix3.prototype.clone = function () {
    var res = new og.math.Matrix3();
    res.set(this);
    return res;
};

og.math.Matrix3.prototype.copy = function (a) {
    this.set(a._m);
};

og.math.Matrix3.prototype.transposeTo = function () {
    var res = new og.math.Matrix3();
    var m = this._m;
    res._m[0] = m[0]; res._m[1] = m[3]; res._m[2] = m[6];
    res._m[3] = m[1]; res._m[4] = m[4]; res._m[5] = m[7];
    res._m[6] = m[2]; res._m[7] = m[5]; res._m[8] = m[8];
    return res;
};

og.math.Matrix3.prototype.setIdentity = function () {
    this._m[0] = 1; this._m[1] = 0; this._m[2] = 0;
    this._m[3] = 0; this._m[4] = 1; this._m[5] = 0;
    this._m[6] = 0; this._m[7] = 0; this._m[8] = 1;
    return this;
};

og.math.Matrix3.prototype.mulVec = function (p) {
    var d = p.x, e = p.y, g = p.z;
    var m = this._m;
    return new og.math.Vector3(
        m[0] * d + m[3] * e + m[6] * g,
        m[1] * d + m[4] * e + m[7] * g,
        m[2] * d + m[5] * e + m[8] * g
    );
};

og.math.Matrix3.prototype.toMatrix4 = function () {
    var res = new og.math.Matrix4();
    var b = res._m;
    var a = this._m;
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
};