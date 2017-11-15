goog.provide('og.math.Vector4');

goog.require('og.math.Vector3');
goog.require('og.math');

/**
 * Class represents a 4d vector.
 * @class
 * @param {number} [x] - First value.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 */
og.math.Vector4 = function (x, y, z, w) {

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

    /**
     * @public
     * @type {number}
     */
    this.z = z || 0.0;

    /**
     * @public
     * @type {number}
     */
    this.w = w || 0.0;
};

/**
 * Identity vector [0,0,0,1].
 * @const
 * @type {og.math.Vector4}
 */
og.math.Vector4.identity = new og.math.Vector4(0, 0, 0, 1);

/**
 * Vector 4d object creator.
 * @function
 * @param {number} [x] - First cvalue.
 * @param {number} [y] - Second value.
 * @param {number} [z] - Third value.
 * @param {number} [w] - Fourth value.
 * @returns {og.math.Vector4}
 */
og.math.vector4 = function (x, y, z, w) {
    return new og.math.Vector4(x, y, z, w);
};

/**
 * Creates 4d vector from array.
 * @function
 * @param {Array.<number,number,number,number>}
 * @returns {og.math.Vector4}
 */
og.math.Vector4.fromVec = function (arr) {
    return new og.math.Vector4(arr[0], arr[1], arr[2], arr[3]);
};

/**
 * Converts to 3d vector, without fourth value.
 * @public
 * @returns {og.math.Vector3}
 */
og.math.Vector4.prototype.toVector3 = function () {
    return new og.math.Vector3(this.x, this.y, this.z);
};

/**
 * Returns clone vector.
 * @public
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.clone = function (v) {
    return new og.math.Vector4(this.x, this.y, this.z, this.w);
};

/**
 * Compares with vector. Returns true if it equals another.
 * @public
 * @param {og.math.Vector4} p - Vector to compare.
 * @returns {boolean}
 */
og.math.Vector4.prototype.equal = function (v) {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
};

/**
 * Copy input vector's values.
 * @param {og.math.Vector4} v - Vector to copy.
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = v.w;
    return this;
};

/**
 * Converts vector to a number array.
 * @public
 * @returns {Array.<number,number,number,number>}
 * @deprecated
 */
og.math.Vector4.prototype.toVec = function () {
    return [this.x, this.y, this.z, this.w];
};


/**
 * Converts vector to a number array.
 * @public
 * @returns {Array.<number,number,number,number>}
 */
og.math.Vector4.prototype.toArray = function () {
    return [this.x, this.y, this.z, this.w];
};

/**
 * Sets vector's values.
 * @public
 * @param {number} x - Value X.
 * @param {number} y - Value Y.
 * @param {number} z - Value Z.
 * @param {number} w - Value W.
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.set = function (x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
};

/**
 * Adds vector to the current.
 * @public
 * @param {og.math.Vector4}
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.addA = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
};

/**
 * Subtract vector from the current.
 * @public
 * @param {og.math.Vector4} v - Subtract vector.
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.subA = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
    return this;
};

/**
 * Scale current vector.
 * @public
 * @param {number} scale - Scale value.
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.scale = function (scale) {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    this.w *= scale;
    return this;
};

/**
 * Makes vector affinity. Thereby fourh component becomes to 1.0.
 * @public
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.affinity = function () {
    var iw = 1 / this.w;
    this.x *= iw;
    this.y *= iw;
    this.z *= iw;
    this.w = 1.0;
    return this;
};

/**
 * Scale current vector to another instance.
 * @public
 * @param {number} scale - Scale value.
 * @returns {og.math.Vector3}
 */
og.math.Vector4.prototype.scaleTo = function (scale) {
    return new og.math.Vector4(this.x * scale, this.y * scale, this.z * scale, this.w * scale);
};

/**
 * Vector's edge function that returns vector where each component is 0.0 if it's smaller then edge and otherwise 1.0.
 * @public
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.getStep = function (edge) {
    return new og.math.Vector4(
        this.x < edge ? 0.0 : 1.0,
        this.y < edge ? 0.0 : 1.0,
        this.z < edge ? 0.0 : 1.0,
        this.w < edge ? 0.0 : 1.0
    );
};

/**
 * The vector fract function returns the vector of fractional parts of each value, i.e. x minus floor(x).
 * @public
 * @returns {og.math.Vector4}
 */
og.math.Vector4.prototype.getFrac = function (v) {
    return new og.math.Vector4(
        og.math.frac(v.x),
        og.math.frac(v.y),
        og.math.frac(v.z),
        og.math.frac(v.w)
    );
};

/**
 * Gets vectors dot production.
 * @public
 * @param {og.math.Vector4} v - Another vector.
 * @returns {number} - Dot product.
 */
og.math.Vector4.prototype.dot = function (v) {
    return v.x * this.x + v.y * this.y + v.z * this.z + v.w * this.w;
};