goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');
goog.require('og.math.Vector4');

/**
 * Base class for billboards and label
 *
 *
 */
og.BaseBillboard = function (options) {
    options = options || {};

    this._entity = null;

    this._handler = null;
    this._handlerIndex = -1;

    this.id = options.id || ("noname_" + og.BaseBillboard.__staticId++);

    this.position = new og.math.Vector3();
    this.rotation = 0;
    this.color = new og.math.Vector4(1.0, 1.0, 1.0, 1.0);
    this.alignedAxis = new og.math.Vector3();
    this.offset = new og.math.Vector3();
    this.visibility = true;
    this.size = null;
};

og.BaseBillboard.__staticId = 0;

og.BaseBillboard.prototype.setPosition3v = function (position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.position.z = position.z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, position);
};

og.BaseBillboard.prototype.setPickingColor3v = function (color) {
    this._handler && this._handler.setPickingColorArr(this._handlerIndex, color);
};

og.BaseBillboard.prototype.setPosition = function (x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, this.position);
};

og.BaseBillboard.prototype.setOffset = function (offset) {
    this.offset.x = offset.x;
    this.offset.y = offset.y;
    this._handler && this._handler.setOffsetArr(this._handlerIndex, offset);
};

og.BaseBillboard.prototype.setRotation = function (rotation) {
    this.rotation = rotation;
    this._handler && this._handler.setRotationArr(this._handlerIndex, rotation);
};

og.BaseBillboard.prototype.setColor4v = function (color) {
    this.color.x = color.x;
    this.color.y = color.y;
    this.color.z = color.z;
    this.color.w = color.w;
    this._handler && this._handler.setRgbaArr(this._handlerIndex, color);
};

og.BaseBillboard.prototype.setColor = function (color) {
    this.setColor4v(og.utils.htmlColor2rgba(color));
};

og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
};

og.BaseBillboard.prototype.setAlignedAxis3v = function (alignedAxis) {
    this.alignedAxis.x = alignedAxis.x;
    this.alignedAxis.y = alignedAxis.y;
    this.alignedAxis.z = alignedAxis.z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, alignedAxis);
};

og.BaseBillboard.prototype.setAlignedAxis = function (x, y, z) {
    this.alignedAxis.x = x;
    this.alignedAxis.y = y;
    this.alignedAxis.z = z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, this.alignedAxis);
};

og.BaseBillboard.prototype.remove = function () {
    this._entity = null;
    this._handler && this._handler.remove(this);
};