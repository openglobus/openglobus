goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');

/**
 *
 *
 *
 */
og.BaseBillboard = function (options) {
    options = options || {};
    this._billboardHandler = null;
    this._billboardHandlerIndex = -1;

    this.id = options.id || ("noname_" + og.BaseBillboard.__staticId++);

    this.position = new og.math.Vector3();
    this.rotation = 0;
    this.opacity = 1.0;
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
    this._billboardHandler && this._billboardHandler.setPositionArr(this._billboardHandlerIndex, position);
};

og.BaseBillboard.prototype.setOffset = function (offset) {
    this.offset.x = offset.x;
    this.offset.y = offset.y;
    this._billboardHandler && this._billboardHandler.setOffsetArr(this._billboardHandlerIndex, offset);
};

og.BaseBillboard.prototype.setRotation = function (rotation) {
    this.rotation = rotation;
    this._billboardHandler && this._billboardHandler.setRotationArr(this._billboardHandlerIndex, rotation);
};

og.BaseBillboard.prototype.setOpacity = function (opacity) {
    this.opacity = opacity;
    this._billboardHandler && this._billboardHandler.setOpacityArr(this._billboardHandlerIndex, opacity);
};

og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._billboardHandler && this._billboardHandler.setVisibility(this._billboardHandlerIndex, visibility);
};

og.BaseBillboard.prototype.setAlignedAxis = function (alignedAxis) {
    this.alignedAxis.x = alignedAxis.x;
    this.alignedAxis.y = alignedAxis.y;
    this.alignedAxis.z = alignedAxis.z;
    this._billboardHandler && this._billboardHandler.setAlignedAxisArr(this._billboardHandlerIndex, alignedAxis);
};

og.BaseBillboard.prototype.remove = function () {
    this._billboardHandler && this._billboardHandler.remove(this);
};