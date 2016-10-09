goog.provide('og.math.Vector2');

goog.require('og.math.Vector3');

/**
 * Class represents a 3d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 */
og.math.Vector2 = function (x, y) {

    /**
     * @public
     * @type {number}
     */
    this.x = x || 0.0;

    /**
     * @public
     * @type {number}
     */
    this.y = y || 0.0;
};

/**
 * Vector 2d object creator.
 * @function
 * @param {number} [x] - First cvalue.
 * @param {number} [y] - Second value.
 * @returns {og.math.Vector2}
 */
og.math.vector2 = function (x, y) {
    return new og.math.Vector2(x, y);
};

/** @const */
og.math.Vector2.UP = new og.math.Vector2(0, 1);
/** @const */
og.math.Vector2.DOWN = new og.math.Vector2(0, -1);
/** @const */
og.math.Vector2.RIGHT = new og.math.Vector2(1, 0);
/** @const */
og.math.Vector2.LEFT = new og.math.Vector2(-1, 0);
/** @const */
og.math.Vector2.ZERO = new og.math.Vector2();

/**
 * Returns summary vector.
 * @static
 * @param {og.math.Vector2} a - First vector.
 * @param {og.math.Vector2} b - Second vector.
 * @returns {og.math.Vector2} - Summary vector.
 */
og.math.Vector2.add = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.addA(b);
    return res;
};

/**
 * Returns two vectors subtraction.
 * @static
 * @param {og.math.Vector2} a - First vector.
 * @param {og.math.Vector2} b - Second vector.
 * @returns {og.math.Vector2} - Vectors subtraction.
 */
og.math.Vector2.sub = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.subA(b);
    return res;
};

/**
 * Returns scaled vector.
 * @static
 * @param {og.math.Vector2} a - Input vector.
 * @param {number} scale - Scale value.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.scale = function (a, scale) {
    var res = new og.math.Vector2(a.x, a.y);
    res.scale(scale)
    return res;
};

/**
 * Returns two vectors production.
 * @static
 * @param {og.math.Vector2} a - First vector.
 * @param {og.math.Vector2} b - Second vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.mul = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.mulA(b);
    return res;
};

/**
 * Returns vector components division product one to another.
 * @static
 * @param {og.math.Vector2} a - First vector.
 * @param {og.math.Vector2} b - Second vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.div = function (a, b) {
    var res = new og.math.Vector2(a.x, a.y);
    res.divA(b);
    return res;
};

/**
 * Get projection of the first vector to the second.
 * @static
 * @param {og.math.Vector2} b - First vector.
 * @param {og.math.Vector2} a - Second vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.proj_b_to_a = function (b, a) {
    return a.scaleTo(a.dot(b) / a.dot(a));
};

/**
 * Gets angle between two vectors.
 * @static
 * @param {og.math.Vector2} a - First vector.
 * @param {og.math.Vector2} b - Second vector.
 * @returns {number}
 */
og.math.Vector2.angle = function (a, b) {
    return Math.acos(a.dot(b) / Math.sqrt(a.length2() * b.length2()));
};

/**
 * Makes vectors normalized and orthogonal to each other.
 * @static
 * @param {og.math.Vector2} normal - Normal vector.
 * @param {og.math.Vector2} tangent - Tangent vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.orthoNormalize = function (normal, tangent) {
    normal = normal.norm();
    normal.scale(tangent.dot(normal));
    return tangent.sub(normal).normalize();
};

/**
 * Converts to 3d vector, third value is 0.0.
 * @public
 * @returns {og.math.Vector3}
 */
og.math.Vector2.prototype.toVector3 = function () {
    return new og.math.Vector3(this.x, this.y, 0);
};

/**
 * Returns clone vector.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.clone = function () {
    return new og.math.Vector2(this.x, this.y);
};

/**
 * Compares with vector. Returns true if it equals another.
 * @public
 * @param {og.math.Vector2} p - Vector to compare.
 * @returns {boolean}
 */
og.math.Vector2.prototype.equal = function (p) {
    return this.x === p.x && this.y === p.y;
};

/**
 * Copy input vector's values.
 * @param {og.math.Vector2} point2 - Vector to copy.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.copy = function (point2) {
    this.x = point2.x;
    this.y = point2.y;
    return this;
};

/**
 * Gets vector's length.
 * @public
 * @returns {number}
 */
og.math.Vector2.prototype.length = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 * Returns squared vector's length.
 * @public
 * @returns {number}
 */
og.math.Vector2.prototype.length2 = function () {
    return this.x * this.x + this.y * this.y;
};

/**
 * Adds vector to the current.
 * @public
 * @param {og.math.Vector2}
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.addA = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

/**
 * Subtract vector from the current.
 * @public
 * @param {og.math.Vector2} v - Subtract vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.subA = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

/**
 * Scale current vector.
 * @public
 * @param {number} scale - Scale value.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.scale = function (scale) {
    this.x *= scale;
    this.y *= scale;
    return this;
};

/**
 * Scale current vector to another instance.
 * @public
 * @param {number} scale - Scale value.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.scaleTo = function (scale) {
    return new og.math.Vector2(this.x * scale, this.y * scale);
};

/**
 * Multiply current vector object to another and store result in the current instance.
 * @public
 * @param {og.math.Vector2} vec - Multiply vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.mulA = function (vec) {
    this.x *= vec.x;
    this.y *= vec.y;
    return this;
};

/**
 * Divide current vector's components to another. Results stores in the current vector object.
 * @public
 * @param {og.math.Vector2}
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.divA = function (vec) {
    this.x /= vec.x;
    this.y /= vec.y;
    return this;
};

/**
 * Gets vectors dot production.
 * @public
 * @param {og.math.Vector2} v - Another vector.
 * @returns {number}
 */
og.math.Vector2.prototype.dot = function (v) {
    return v.x * this.x + v.y * this.y;
};

/**
 * Gets vectors dot production.
 * @public
 * @param {Array.<number,number>} arr - Array vector.
 * @returns {number}
 */
og.math.Vector2.prototype.dotArr = function (arr) {
    return arr[0] * this.x + arr[1] * this.y;
};

/**
 * Gets vectors cross production.
 * @public
 * @param {og.math.Vector2} v - Another vector.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.cross = function (v) {
    return this.x * v.y - this.y * v.x;
};

/**
 * Sets vector to zero.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.clear = function () {
    this.x = this.y = 0;
    return this;
};

/**
 * Returns normalized vector.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.normal = function () {
    var res = new og.math.Vector2();
    res.copy(this);

    var length = 1.0 / res.length();

    res.x *= length;
    res.y *= length;

    return res;
};

/**
 * Normalize current vector.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.normalize = function () {
    var length = 1.0 / this.length();

    this.x *= length;
    this.y *= length;

    return this;
};

/**
 * Converts vector to a number array.
 * @public
 * @returns {Array.<number,number>}
 */
og.math.Vector2.prototype.toVec = function () {
    var x = new og.math.GLArray(2);
    x[0] = this.x;
    x[1] = this.y;
    return x;
};

/**
 * Gets distance to point.
 * @public
 * @param {og.math.Vector2} p - Distant point.
 * @returns {number}
 */
og.math.Vector2.prototype.distance = function (p) {
    var vec = og.math.Vector2.sub(this, p);
    return vec.length();
};

/**
 * Sets vector's values.
 * @public
 * @param {number} x - Value X.
 * @param {number} y - Value Y.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.set = function (x, y) {
    this.x = x;
    this.y = y;
    return this;
};

/**
 * Negate current vector.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.negate = function () {
    this.x = -this.x;
    this.y = -this.y;
    return this;
};

/**
 * Negate current vector to another instance.
 * @public
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.negateTo = function () {
    return new og.math.Vector2(-this.x, -this.y);
};

/**
 * Gets projected point coordinates of the current vector on the ray.
 * @public
 * @param {og.math.Vector2} pos - Ray position.
 * @param {og.math.Vector2} direction - Ray direction.
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.projToRay = function (pos, direction) {
    var v = og.math.Vector2.proj_b_to_a(og.math.Vector2.sub(this, pos), direction);
    v.add(pos);
    return v;
};

/**
 * Gets angle between two vectors.
 * @public
 * @param {og.math.Vector2} a - Another vector.
 * @returns {number}
 */
og.math.Vector2.prototype.angle = function (a) {
    return og.math.Vector2.angle(this, a);
};

/**
 * Returns two vectors linear interpolation.
 * @public
 * @param {og.math.Vector2} v2 - End vector.
 * @param {number} l - Interpolate value.
 * @returns {og.math.Vector2}
 */
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

/**
 * Spherically interpolates between two vectors.
 * Interpolates between current and v2 vector by amount t. The difference between this and linear interpolation (aka, "lerp") is that 
 * the vectors are treated as directions rather than points in space. The direction of the returned vector is interpolated 
 * by the angle and its magnitude is interpolated between the magnitudes of from and to.
 * @public
 * @param {og.math.Vector2} v2 - 
 * @param {number} t - The parameter t is clamped to the range [0, 1].
 * @returns {og.math.Vector2}
 */
og.math.Vector2.prototype.slerp = function (v2, t) {
    var res = new og.math.Vector2();

    if (t <= 0.0) {
        res.copy(this);
        return;
    } else if (t >= 1.0) {
        res.copy(v2);
        return;
    }

    var omega, sinom, scale0, scale1;
    var cosom = this.dot(v2);

    if ((1.0 - cosom) > Vector2.LERP_DELTA) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        scale0 = 1.0 - t;
        scale1 = t;
    }

    return og.math.Vector2.add(this.scale(scale0), v2.scale(scale1));
};