goog.provide('og.BaseBillboard');

goog.require('og.math.Vector3');

/**
 *
 *
 *
 */
og.BaseBillboard = function () {
    this._billboardsHandler = null;
    this._billboardsHandlerIndex = -1;

    this.position = new og.math.Vector3();
    this.rotation = 0;
    this.opacity = 1.0;
    this.alignedAxis = new og.math.Vector3();
    this.offset = new og.math.Vector3();
    this.visibility = true;
    this.size = null;
};

og.BaseBillboard.prototype.setPosition = function (position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.position.z = position.z;
    this._billboardsHandler && this._billboardsHandler.setPositionArr(this._billboardsHandlerIndex, position);
};

og.BaseBillboard.prototype.setOffset = function (offset) {
    this.offset.x = offset.x;
    this.offset.y = offset.y;
    this._billboardsHandler && this._billboardsHandler.setOffsetArr(this._billboardsHandlerIndex, offset);
};

og.BaseBillboard.prototype.setRotation = function (rotation) {
    this.rotation = rotation;
    this._billboardsHandler && this._billboardsHandler.setRotationArr(this._billboardsHandlerIndex, rotation);
};

og.BaseBillboard.prototype.setOpacity = function (opacity) {
    this.opacity = opacity;
    this._billboardsHandler && this._billboardsHandler.setOpacityArr(this._billboardsHandlerIndex, opacity);
};

og.BaseBillboard.prototype.setVisibility = function (visibility) {
    this._billboardsHandler && this._billboardsHandler.setVisibility(this._billboardsHandlerIndex, visibility);
};

og.BaseBillboard.prototype.setAlignedAxis = function (alignedAxis) {
    this.alignedAxis.x = alignedAxis.x;
    this.alignedAxis.y = alignedAxis.y;
    this.alignedAxis.z = alignedAxis.z;
    this._billboardsHandler && this._billboardsHandler.setAlignedAxisArr(this._billboardsHandlerIndex, alignedAxis);
};

og.BaseBillboard.prototype.addTo = function (billboardCollection) {
    billboardCollection.add(this);
    return this;
};

og.BaseBillboard.prototype.remove = function () {
    this._billboardsHandler && this._billboardsHandler.remove(this);
};