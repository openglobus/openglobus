og.math.Vector4 = function (x, y, z, w) {
    this.x = x ? x : 0.0;
    this.y = y ? y : 0.0;
    this.z = z ? z : 0.0;
    this.w = w ? w : 0.0;
};

og.math.Vector4.prototype.toVector3 = function () {
    return new og.math.Vector3(this.x, this.y, this.z);
};

og.math.Vector4.clone = function (v) {
    return new og.math.Vector4(v.x, v.y, v.z, v.w);
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
    return [this.x, this.y, this.z, this.w];
};

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