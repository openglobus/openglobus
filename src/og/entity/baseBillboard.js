goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');
goog.require('og.math.Vector4');

/**
 *
 *
 *
 */
og.BaseBillboard = function (options) {
    options = options || {};
    this._handler = null;
    this._handlerIndex = -1;

    this.id = options.id || ("noname_" + og.BaseBillboard.__staticId++);

    this.position = new og.math.Vector3();
    this.rotation = 0;
    this.rgba = new og.math.Vector4(1.0, 1.0, 1.0, 1.0);
    this.alignedAxis = new og.math.Vector3();
    this.offset = new og.math.Vector3();
    this.visibility = true;
    this.size = null;
};

og.BaseBillboard.__staticId = 0;

og.BaseBillboard.prototype.setPosition = function (position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.position.z = position.z;
    this._handler && this._handler.setPositionArr(this._handlerIndex, position);
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

og.BaseBillboard.prototype.setRgba = function (rgba) {
    this.rgba.x = rgba.x;
    this.rgba.y = rgba.y;
    this.rgba.z = rgba.z;
    this.rgba.w = rgba.w;
    this._handler && this._handler.setRgbaArr(this._handlerIndex, rgba);
};

og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._handler && this._handler.setVisibility(this._handlerIndex, visibility);
};

og.BaseBillboard.prototype.setAlignedAxis = function (alignedAxis) {
    this.alignedAxis.x = alignedAxis.x;
    this.alignedAxis.y = alignedAxis.y;
    this.alignedAxis.z = alignedAxis.z;
    this._handler && this._handler.setAlignedAxisArr(this._handlerIndex, alignedAxis);
};

og.BaseBillboard.prototype.remove = function () {
    this._handler && this._handler.remove(this);
};