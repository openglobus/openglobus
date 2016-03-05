goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');
goog.require('og.math.Vector4');
goog.require('og.utils');

/**
 * Base prototype for billboard and label classes.
 * @class
 * @param {Object} [options] - Options:
 * @param {og.math.Vector3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotaion.
 * @param {og.math.Vector4|string|Array.<number>} [options.color] - Billboard color.
 * @param {og.math.Vector3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {og.math.Vector3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 */
og.BaseBillboard = function (options) {
    options = options || {};

    this.id = og.BaseBillboard.__staticId++;

    this._position = og.utils.createVector3(options.position);
    this._rotation = options.rotation || 0;
    this._color = og.utils.createColor(options.color);
    this._alignedAxis = og.utils.createVector3(options.algnedAxis);
    this._offset = og.utils.createVector3(options.offset)
    this._visibility = options.visibility != undefined ? options.visibility : true;
    this._scale = options.scale || 1.0;

    /**
     * Entity instance that holds this billboard.
     * @private
     * @type {og.Entity}
     */
    this._entity = null;

    /**
     * Handler that stores and renders this billboard object.
     * @private
     * @type {og.BillboardHandler}
     */
    this._handler = null;
    this._handlerIndex = -1;
};

og.BaseBillboard.__staticId = 0;

/**
 * Sets billboard position.
 * @public
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} z - Z coordinate.
 */
og.BaseBillboard.prototype.setPosition = function (x, y, z) {
    this._position.x = x;
    this._position.y = y;
    this._position.z = z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, this._position);
};

/**
 * Sets billboard position.
 * @public
 * @param {og.math.Vector3} position - Cartesian coordinates.
 */
og.BaseBillboard.prototype.setPosition3v = function (position) {
    this._position.x = position.x;
    this._position.y = position.y;
    this._position.z = position.z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, position);
};

/**
 * Returns billboard position.
 * @public
 * @returns {og.math.Vector3}
 */
og.BaseBillboard.prototype.getPosition = function () {
    return this._position;
};

/**
 * Sets screen space offset.
 * @public
 * @param {number} x - X offset.
 * @param {number} y - Y offset.
 * @param {number} [z] - Z offset.
 */
og.BaseBillboard.prototype.setOffset = function (x, y, z) {
    this._offset.x = x;
    this._offset.y = y;
    (z != undefined) && (this._offset.z = z);
    this._handler && this._handler.setOffsetArr(this._handlerIndex, this._offset);
};

/**
 * Sets billboard scale.
 * @public
 * @param {number} scale - Scale.
 */
og.BaseBillboard.prototype.setScale = function (scale) {
    this._scale = scale;
    this._handler && this._handler.setScaleArr(this._handlerIndex, scale);
};

/**
 * Gets billboard scale.
 * @public
 * @returns {number}
 */
og.BaseBillboard.prototype.getScale = function () {
    return this._scale;
};

/**
 * Sets screen space offset.
 * @public
 * @param {og.math.Vector2} offset - Offset size.
 */
og.BaseBillboard.prototype.setOffset3v = function (offset) {
    this._offset.x = offset.x;
    this._offset.y = offset.y;
    (offset.z != undefined) && (this._offset.z = offset.z);
    this._handler && this._handler.setOffsetArr(this._handlerIndex, offset);
};

/**
 * Returns billboard screen space offset size.
 * @public
 * @returns {og.math.Vector3}
 */
og.BaseBillboard.prototype.getOffset = function () {
    return this._offset;
};

/**
 * Sets billboard screen space rotation in radians.
 * @public
 * @param {number} rotation - Screen space rotation in radians.
 */
og.BaseBillboard.prototype.setRotation = function (rotation) {
    this._rotation = rotation;
    this._handler && this._handler.setRotationArr(this._handlerIndex, rotation);
};

/**
 * Gets screen space rotation.
 * @public
 * @returns {number}
 */
og.BaseBillboard.prototype.getRotation = function () {
    return this._rotation;
};

/**
 * Sets billboard opacity.
 * @public
 * @param {number} a - Billboard opacity.
 */
og.BaseBillboard.prototype.setOpacity = function (a) {
    this._color.w = a;
    this.setColor(this._color.x, this._color.y, this._color.z, a);
};

/**
 * Sets RGBA color. Each channel from 0.0 to 1.0.
 * @public
 * @param {number} r - Red.
 * @param {number} g - Green.
 * @param {number} b - Blue.
 * @param {number} a - Alpha.
 */
og.BaseBillboard.prototype.setColor = function (r, g, b, a) {
    this._color.x = r;
    this._color.y = g;
    this._color.z = b;
    (a != undefined) && (this._color.w = a);
    this._handler && this._handler.setRgbaArr(this._handlerIndex, this._color);
};

/**
 * Sets RGBA color. Each channel from 0.0 to 1.0.
 * @public
 * @param {og.math.Vector4} color - RGBA vector.
 */
og.BaseBillboard.prototype.setColor4v = function (color) {
    this._color.x = color.x;
    this._color.y = color.y;
    this._color.z = color.z;
    (color.w != undefined) && (this._color.w = color.w);
    this._handler && this._handler.setRgbaArr(this._handlerIndex, color);
};

/**
 * Sets billboard color.
 * @public
 * @param {string} color - HTML style color.
 */
og.BaseBillboard.prototype.setColorHTML = function (color) {
    this.setColor4v(og.utils.htmlColor2rgba(color));
};

/**
 * Returns RGBA color.
 * @public
 * @returns {og.math.Vector4}
 */
og.BaseBillboard.prototype.getColor = function () {
    return this._color;
};

/**
 * Sets billboard visibility.
 * @public
 * @param {boolean} visibility - Visibility flag.
 */
og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;
    this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
};

/**
 * Returns billboard visibility.
 * @public
 * @returns {boolean}
 */
og.BaseBillboard.prototype.getVisibility = function () {
    return this._visibility;
};

/**
 * Sets billboard cartesian aligned vector.
 * @public
 * @param {number} x - Aligned vector X coordinate.
 * @param {number} y - Aligned vector Y coordinate.
 * @param {number} z - Aligned vector Z coordinate.
 */
og.BaseBillboard.prototype.setAlignedAxis = function (x, y, z) {
    this._alignedAxis.x = x;
    this._alignedAxis.y = y;
    this._alignedAxis.z = z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, this._alignedAxis);
};

/**
 * Sets billboard aligned vector.
 * @public
 * @param {og.math.Vecto3} alignedAxis - Vector to align.
 */
og.BaseBillboard.prototype.setAlignedAxis3v = function (alignedAxis) {
    this._alignedAxis.x = alignedAxis.x;
    this._alignedAxis.y = alignedAxis.y;
    this._alignedAxis.z = alignedAxis.z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, alignedAxis);
};

/**
 * Returns aligned vector.
 * @public
 * @returns {og.math.Vector3}
 */
og.BaseBillboard.prototype.getAlignedAxis = function () {
    return this._alignedAxis;
};

/**
 * Removes billboard from hander.
 * @public
 */
og.BaseBillboard.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

/**
 * Sets billboard picking color.
 * @public
 * @param {og.math.Vector3} color - Picking color.
 */
og.BaseBillboard.prototype.setPickingColor3v = function (color) {
    this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
};