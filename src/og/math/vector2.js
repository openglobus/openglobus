goog.provide('og.math.Vector2');

goog.require('og.math.Vector3');

og.math.Vector2 = function (x, y) {
    this.x = x || 0.0;
    this.y = y || 0.0;
}

og.math.Vector2.prototype.toVector3 = function () {
    return new og.math.Vector3(this.x, this.y, 0);
};

og.math.Vector2.UP = new og.math.Vector2(0, 1);
og.math.Vector2.DOWN = new og.math.Vector2(0, -1);
og.math.Vector2.RIGHT = new og.math.Vector2(1, 0);
og.math.Vector2.LEFT = new og.math.Vector2(-1, 0);
og.math.Vector2.ZERO = new og.math.Vector2();

og.math.Vector2.prototype.clone = function () {
    return new og.math.Vector2(this.x, this.y);
};

og.math.Vector2.add = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.addA(b);
    return res;
};

og.math.Vector2.sub = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.subA(b);
    return res;
};

og.math.Vector2.scale = function (a, scale) {
    var res = new og.math.Vector2(a.x, a.y);
    res.scale(scale)
    return res;
};

og.math.Vector2.mull = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.mullA(b);
    return res;
};

og.math.Vector2.div = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.divA(b);
    return res;
};

og.math.Vector2.prototype.equal = function (p) {
    return this.x === p.x && this.y === p.y;
};

og.math.Vector2.prototype.copy = function (point2) {
    this.x = point2.x;
    this.y = point2.y;
    return this;
};

og.math.Vector2.prototype.length = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

og.math.Vector2.prototype.length2 = function () {
    return this.x * this.x + this.y * this.y;
};

og.math.Vector2.prototype.addA = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

og.math.Vector2.prototype.subA = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

og.math.Vector2.prototype.scale = function (scale) {
    this.x *= scale;
    this.y *= scale;
    return this;
};

og.math.Vector2.prototype.scaleTo = function (scale) {
    return new og.math.Vector2(this.x * scale, this.y * scale);
};

og.math.Vector2.prototype.mullA = function (vec) {
    this.x *= vec.x;
    this.y *= vec.y;
    return this;
};

og.math.Vector2.prototype.divA = function (vec) {
    this.x /= vec.x;
    this.y /= vec.y;
    return this;
};

og.math.Vector2.prototype.dot = function (v) {
    return v.x * this.x + v.y * this.y + v.z * this.z;
};

og.math.Vector2.prototype.dotArr = function (arr) {
    return arr[0] * this.x + arr[1] * this.y;
};

og.math.Vector2.prototype.cross = function (v) {
    return this.x * v.y - this.y * v.x;
};

og.math.Vector2.prototype.clear = function () {
    this.x = this.y = 0;
    return this;
};

og.math.Vector2.prototype.normal = function () {
    var res = new og.math.Vector2();
    res.copy(this);

    var length = 1.0 / res.length();

    res.x *= length;
    res.y *= length;

    return res;
};

og.math.Vector2.prototype.normalize = function () {
    var length = 1.0 / this.length();

    this.x *= length;
    this.y *= length;

    return this;
};

og.math.Vector2.prototype.toVec = function () {
    var x = new og.math.GLArray(2);
    x[0] = this.x;
    x[1] = this.y;
    return x;
};

og.math.Vector2.prototype.distance = function (p) {
    var vec = og.math.Vector2.sub(this, p);
    return vec.length();
};

og.math.Vector2.prototype.set = function (x, y) {
    this.x = x;
    this.y = y;
    return this;
};

og.math.Vector2.prototype.negate = function () {
    this.x = -this.x;
    this.y = -this.y;
    return this;
};

og.math.Vector2.prototype.negateTo = function () {
    return new og.math.Vector2(-this.x, -this.y);
};

og.math.Vector2.proj_b_to_a = function (b, a) {
    return a.scaleTo(a.dot(b) / a.dot(a));
};

og.math.Vector2.prototype.projToRay = function (pos, direction) {
    var v = og.math.Vector2.proj_b_to_a(og.math.Vector2.sub(this, pos), direction);
    v.add(pos);
    return v;
};

og.math.Vector2.prototype.angle = function (a) {
    return og.math.Vector2.angle(this, a);
};

og.math.Vector2.angle = function (a, b) {
    return Math.acos(a.dot(b) / Math.sqrt(a.length2() * b.length2()));
};

og.math.Vector2.prototype.lerp = function (v1, v2, l) {
    var res = og.math.Vector2.clone(this);
    if (l <= 0.0) {
        res.copy(v1);
    } else if (l >= 1.0) {
        res.copy(v2);
    } else {
        res = og.math.Vector2.add(v1, og.math.Vector2.sub(v2, v1).scale(l));
    }
    return res;
};

og.math.Vector2.LERP_DELTA = 1e-6;

og.math.Vector2.prototype.slerp = function (v1, v2, t) {
    var res = new og.math.Vector2();

    if (t <= 0.0) {
        res.copy(v1);
        return;
    } else if (t >= 1.0) {
        res.copy(v2);
        return;
    }

    var omega, sinom, scale0, scale1;
    var cosom = v1.dot(v2);

    if ((1.0 - cosom) > Vector2.LERP_DELTA) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1.0 - t;
        scale1 = t;
    }

    return og.math.Vector2.add(v1.scale(scale0), v2.scale(scale1));
};

og.math.Vector2.orthoNormalize = function (normal, tangent) {
    normal = normal.norm();
    normal.scale(tangent.dot(normal));
    return tangent.sub(normal).normalize();
};