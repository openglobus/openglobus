goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');
goog.require('og.math.Vector4');

/**
 * Base prototype for billboard and label classes.
 * @class
 * @param {Object} [options] - Options:
 * @param {string} [options.name] - A human readable name to display to users. It does not have to be unique.
 */
og.BaseBillboard = function (options) {

    options = options || {};

    this.name = options.name || ("noname_" + og.BaseBillboard.__staticId++);

    this._position = new og.math.Vector3();
    this._rotation = 0;
    this._color = new og.math.Vector4(1.0, 1.0, 1.0, 1.0);
    this._alignedAxis = new og.math.Vector3();
    this._offset = new og.math.Vector3();
    this._visibility = true;

    this._entity = null;
    this._handler = null;
    this._handlerIndex = -1;
};

og.BaseBillboard.__staticId = 0;

og.BaseBillboard.prototype.getPosition = function () {
    return this._position;
};

og.BaseBillboard.prototype.setPosition3v = function (position) {
    this._position.x = position.x;
    this._position.y = position.y;
    this._position.z = position.z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, position);
};

og.BaseBillboard.prototype.setPosition = function (x, y, z) {
    this._position.x = x;
    this._position.y = y;
    this._position.z = z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, this._position);
};

og.BaseBillboard.prototype.setOffset = function (offset) {
    this._offset.x = offset.x;
    this._offset.y = offset.y;
    this._handler && this._handler.setOffsetArr(this._handlerIndex, offset);
};

og.BaseBillboard.prototype.getOffset = function () {
    return this._offset;
};

og.BaseBillboard.prototype.setRotation = function (rotation) {
    this._rotation = rotation;
    this._handler && this._handler.setRotationArr(this._handlerIndex, rotation);
};

og.BaseBillboard.prototype.getRotation = function () {
    return this._rotation;
};

og.BaseBillboard.prototype.setColor4v = function (color) {
    this._color.x = color.x;
    this._color.y = color.y;
    this._color.z = color.z;
    this._color.w = color.w;
    this._handler && this._handler.setRgbaArr(this._handlerIndex, color);
};

og.BaseBillboard.prototype.getColor = function () {
    return this._color;
};

og.BaseBillboard.prototype.setColor = function (color) {
    this.setColor4v(og.utils.htmlColor2rgba(color));
};

og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._visibility = visibility;
    this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
};

og.BaseBillboard.prototype.getVisibility = function () {
    return this._visibility;
};

og.BaseBillboard.prototype.setAlignedAxis3v = function (alignedAxis) {
    this._alignedAxis.x = alignedAxis.x;
    this._alignedAxis.y = alignedAxis.y;
    this._alignedAxis.z = alignedAxis.z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, alignedAxis);
};

og.BaseBillboard.prototype.getAlignedAxis = function () {
    return this._alignedAxis;
};

og.BaseBillboard.prototype.setAlignedAxis = function (x, y, z) {
    this._alignedAxis.x = x;
    this._alignedAxis.y = y;
    this._alignedAxis.z = z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, this._alignedAxis);
};

og.BaseBillboard.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};

og.BaseBillboard.prototype.setPickingColor3v = function (color) {
    this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
};