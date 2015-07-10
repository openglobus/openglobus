goog.provide('og.math.Vector3');

og.math.Vector3 = function (x, y, z) {
    this.x = x || 0.0;
    this.y = y || 0.0;
    this.z = z || 0.0;
}

og.math.Vector3.prototype.toVector4 = function () {
    return new og.math.Vector4(this.x, this.y, this.z, 1.0);
};

og.math.Vector3.UP = new og.math.Vector3(0, 1, 0);
og.math.Vector3.DOWN = new og.math.Vector3(0, -1, 0);
og.math.Vector3.RIGHT = new og.math.Vector3(1, 0, 0);
og.math.Vector3.LEFT = new og.math.Vector3(-1, 0, 0);
og.math.Vector3.FORWARD = new og.math.Vector3(0, 0, -1);
og.math.Vector3.BACKWARD = new og.math.Vector3(0, 0, 1);
og.math.Vector3.ZERO = new og.math.Vector3();

og.math.Vector3.prototype.clone = function () {
    return new og.math.Vector3(this.x, this.y, this.z);
};

og.math.Vector3.prototype.toString = function () {
    return "(" + this.x + "," + this.y + "," + this.z + ")";
};
og.math.Vector3.add = function (a, b) {
    var res = new og.math.Vector3(a.x, a.y, a.z);
    res.add(b);
    return res;
};

og.math.Vector3.sub = function (a, b) {
    var res = new og.math.Vector3(a.x, a.y, a.z);
    res.sub(b);
    return res;
};

og.math.Vector3.scale = function (a, scale) {
    var res = new og.math.Vector3(a.x, a.y, a.z);
    res.scale(scale)
    return res;
};

og.math.Vector3.mull = function (a, b) {
    var res = new og.math.Vector3(a.x, a.y, a.z);
    res.mull(b);
    return res;
};

og.math.Vector3.div = function (a, b) {
    var res = new og.math.Vector3(a.x, a.y, a.z);
    res.div(b);
    return res;
};

og.math.Vector3.prototype.equal = function (p) {
    return this.x === p.x && this.y === p.y && this.z === p.z;
};

og.math.Vector3.prototype.copy = function (point3) {
    this.x = point3.x;
    this.y = point3.y;
    this.z = point3.z;
    return this;
};

og.math.Vector3.prototype.length = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

og.math.Vector3.prototype.getQuaternion = function () {
    return new og.math.Quaternion(this.x, this.y, this.z);
};

og.math.Vector3.prototype.length2 = function () {
    return this.x * this.x + this.y * this.y + this.z * this.z;
};

og.math.Vector3.prototype.add = function (point3) {
    this.x += point3.x;
    this.y += point3.y;
    this.z += point3.z;
    return this;
};

og.math.Vector3.prototype.sub = function (point3) {
    this.x -= point3.x;
    this.y -= point3.y;
    this.z -= point3.z;
    return this;
};

og.math.Vector3.prototype.scale = function (scale) {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
};

og.math.Vector3.prototype.scaleTo = function (scale) {
    return new og.math.Vector3(this.x * scale, this.y * scale, this.z * scale);
};

og.math.Vector3.prototype.mull = function (vec) {
    this.x *= vec.x;
    this.y *= vec.y;
    this.z *= vec.z;
    return this;
};

og.math.Vector3.prototype.div = function (vec) {
    this.x /= vec.x;
    this.y /= vec.y;
    this.z /= vec.z;
    return this;
};

og.math.Vector3.prototype.dot = function (point3) {
    return point3.x * this.x + point3.y * this.y + point3.z * this.z;
};

og.math.Vector3.prototype.dotArr = function (arr) {
    return arr[0] * this.x + arr[1] * this.y + arr[2] * this.z;
};

og.math.Vector3.prototype.cross = function (point3) {
    var res = new og.math.Vector3();
    res.set(
        this.y * point3.z - this.z * point3.y,
        this.z * point3.x - this.x * point3.z,
        this.x * point3.y - this.y * point3.x
    );
    return res;
};

og.math.Vector3.noncollinear = function (a, b) {
    return a.y * b.z - a.z * b.y || a.z * b.x - a.x * b.z || a.x * b.y - a.y * b.z;
};

og.math.Vector3.prototype.clear = function () {
    this.x = this.y = this.z = 0;
    return this;
};

og.math.Vector3.prototype.normal = function () {
    var res = new og.math.Vector3();
    res.copy(this);

    var length = 1.0 / res.length();

    res.x *= length;
    res.y *= length;
    res.z *= length;

    return res;
};

og.math.Vector3.prototype.normalize = function () {
    var length = 1.0 / this.length();

    this.x *= length;
    this.y *= length;
    this.z *= length;

    return this;
};


og.math.Vector3.prototype.toVec = function () {
    return [this.x, this.y, this.z];
};

og.math.Vector3.prototype.distance = function (point3) {
    var vec = og.math.Vector3.sub(this, point3);
    return vec.length();
};

og.math.Vector3.prototype.set = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
};

og.math.Vector3.prototype.negate = function () {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

og.math.Vector3.prototype.getNegate = function () {
    return new og.math.Vector3(-this.x, -this.y, -this.z);
};

og.math.Vector3.proj_b_to_a = function (b, a) {
    return a.scaleTo(a.dot(b) / a.dot(a));
};

og.math.Vector3.prototype.projToRay = function (pos, direction) {
    var v = og.math.Vector3.proj_b_to_a(og.math.Vector3.sub(this, pos), direction);
    v.add(pos);
    return v;
};

og.math.Vector3.prototype.angle = function (a) {
    return og.math.Vector3.angle(this, a);
};

og.math.Vector3.angle = function (a, b) {
    return Math.acos(a.dot(b) / Math.sqrt(a.length2() * b.length2()));
};

og.math.Vector3.prototype.lerp = function (v2, l) {
    return new og.math.Vector3(this.x + (v2.x - this.x) * l, this.y + (v2.y - this.y) * l, this.z + (v2.z - this.z) * l);
};

og.math.Vector3.lerp = function (v1, v2, l) {
    return new og.math.Vector3(v1.x + (v2.x - v1.x) * l, v1.y + (v2.y - v1.y) * l, v1.z + (v2.z - v1.z) * l);
};

og.math.Vector3.prototype.smerp = function (b, d) {
    var one_d = 1 - d;
    return new og.math.Vector3(this.x * d + b.x * one_d, this.y * d + b.y * one_d, this.z * d + b.z * one_d);
};

og.math.Vector3.LERP_DELTA = 1e-6;

og.math.Vector3.prototype.slerp = function (v2, t) {
    var res = new og.math.Vector3();

    if (t <= 0.0) {
        res.copy(this);
        return;
    } else if (t >= 1.0) {
        res.copy(v2);
        return;
    }

    var omega, sinom, scale0, scale1;
    var cosom = this.dot(v2);

    if ((1.0 - cosom) > og.math.Vector3.LERP_DELTA) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1.0 - t;
        scale1 = t;
    }

    return og.math.Vector3.add(this.scaleTo(scale0), v2.scale(scale1));
};

og.math.Vector3.orthoNormalize = function (normal, tangent) {
    normal = normal.normal();
    normal.scale(tangent.dot(normal));
    return tangent.sub(normal).normalize();
};