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

og.math.Matrix3.prototype.transpose = function () {
    var res = new og.math.Matrix3();
    var m = this._m;
    res._m[0] = m[0]; res._m[1] = m[3]; res._m[2] = m[6];
    res._m[3] = m[1]; res._m[4] = m[4]; res._m[5] = m[7];
    res._m[6] = m[2]; res._m[7] = m[5]; res._m[8] = m[8];
    return res;
};