goog.provide('og.shape.Sphere');

goog.require('og.shape.BaseShape');

/**
 * @class
 * @extends {og.shape.BaseShape}
 * @param {Object} options - Sphere parameters:
 * @param {og.math.Vector3} [options.position] - Sphere position.
 * @param {og.math.Quaternion} [options.orientation] - Sphere orientation(rotation).
 * @param {og.math.Vector3} [options.scale] - Scale vector.
 * @param {Array.<number,number,number,number>} [options.color] - Sphere RGBA color.
 * @param {string} [options.src] - Texture image url source.
 * @param {boolean} [options.visibility] - Sphere visibility.
 * @param {number} [options.radius=100] - Sphere radius.
 * @param {number} [options.latBands=16] - Number of latitude bands.
 * @param {number} [options.lonBands=16] - Number of longitude bands.
 */
og.shape.Sphere = function (options) {

    goog.base(this, options);

    /**
     * Sphere radius.
     * @protected
     * @type {number}
     */
    this._radius = options.radius || 100;

    /**
     * Number of latitude bands.
     * @protected
     * @type {number}
     */
    this._latBands = options.latBands || 16;

    /**
     * Number of longitude bands.
     * @protected
     * @type {number}
     */
    this._lonBands = options.lonBands || 16;

    this._createData();
};

goog.inherits(og.shape.Sphere, og.shape.BaseShape);

/**
 * Create specific shape vertices data.
 * @protected
 * @virtual
 */
og.shape.Sphere.prototype._createData = function () {

    for (var latNumber = 0; latNumber <= this._latBands; latNumber++) {
        var theta = latNumber * Math.PI / this._latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= this._lonBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / this._lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / this._lonBands);
            var v = latNumber / this._latBands;
            this._normalData.push(x);
            this._normalData.push(y);
            this._normalData.push(z);
            this._textureCoordData.push(u);
            this._textureCoordData.push(v);
            this._positionData.push(this._radius * x);
            this._positionData.push(this._radius * y);
            this._positionData.push(this._radius * z);
        }
    }

    for (var latNumber = 0; latNumber < this._latBands; latNumber++) {
        for (var longNumber = 0; longNumber < this._lonBands; longNumber++) {
            var first = (latNumber * (this._lonBands + 1)) + longNumber;
            var second = first + this._lonBands + 1;

            this._indexData.push(first);
            this._indexData.push(first + 1);
            this._indexData.push(second);

            this._indexData.push(second);
            this._indexData.push(first + 1);
            this._indexData.push(second + 1);
        }
    }
};