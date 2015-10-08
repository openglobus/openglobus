goog.provide('og.math.Vector4');

goog.require('og.math.Vector3');
goog.require('og.math');

og.math.Vector4 = function (x, y, z, w) {
    this.x = x || 0.0;
    this.y = y || 0.0;
    this.z = z || 0.0;
    this.w = w || 0.0;
};

og.math.Vector4.identity = new og.math.Vector4(0, 0, 0, 1);

og.math.Vector4.prototype.toVector3 = function () {
    return new og.math.Vector3(this.x, this.y, this.z);
};

og.math.Vector4.prototype.clone = function (v) {
    return new og.math.Vector4(this.x, this.y, this.z, this.w);
};

og.math.Vector4.prototype.equal = function (v) {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
};

og.math.Vector4.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w;
    return this;
};

og.math.Vector4.prototype.toVec = function () {
    var x = new og.math.GLArray(4);
    x[0] = this.x;
    x[1] = this.y;
    x[2] = this.z;
    x[3] = this.w;
    return x;
};

og.math.Vector4.fromVec = function (arr) {
    return new og.math.Vector4(arr[0], arr[1], arr[2], arr[3]);
}

og.math.Vector4.prototype.set = function (x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
};

og.math.Vector4.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
};

og.math.Vector4.prototype.sub = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
};

og.math.Vector4.prototype.scale = function (scale) {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    this.w *= scale;
    return this;
};

og.math.Vector4.prototype.affinity = function () {
    var iw = 1 / this.w;
    this.x *= iw;
    this.y *= iw;
    this.z *= iw;
    this.w = 1.0;
    return this;
};

og.math.Vector4.prototype.scaleTo = function (scale) {
    return new og.math.Vector4(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
};

og.math.Vector4.prototype.getStep = function (edge) {
    return new og.math.Vector4(
        this.x < edge ? 0.0 : 1.0,
		this.y < edge ? 0.0 : 1.0,
		this.z < edge ? 0.0 : 1.0,
		this.w < edge ? 0.0 : 1.0
    );
};

og.math.Vector4.prototype.getFrac = function (v) {
    return new og.math.Vector4(
        og.math.frac(v.x),
        og.math.frac(v.y),
        og.math.frac(v.z),
        og.math.frac(v.w)
    );
};