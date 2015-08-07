goog.provide('og.Billboard');
goog.require('og.math.Vector3');
goog.require('og.math.Vector2');


og.Billboard = function () {
    this.position = new og.math.Vector3();
    this.rotation = 0;
    this.opacity = 1.0;
    this.image = null;
    this.offset = new og.math.Vector3();
    this.size = new og.math.Vector2(32, 32);
    this.alignedAxis = null;
    this.visibility = true;
    this._billboardsHandler = null;
    this._billboardsHandlerIndex = -1;
};

og.Billboard.prototype.setPosition = function (position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.position.z = position.z;
    this._billboardsHandler && this._billboardsHandler.setPositionArr(this._billboardsHandlerIndex, position);
};

og.Billboard.prototype.setRotation = function (rotation) {
    this.rotation = rotation;
    this._billboardsHandler && this._billboardsHandler.setRotationArr(this._billboardsHandlerIndex, rotation);
};

og.Billboard.prototype.setOpacity = function (opacity) {
    this.opacity = opacity;
    this._billboardsHandler && this._billboardsHandler.setOpacityArr(this._billboardsHandlerIndex, opacity);
};

og.Billboard.prototype.setImage = function (image) {
    this.image = image;
};

og.Billboard.prototype.setOffset = function (offset) {
    this.offset.x = offset.x;
    this.offset.y = offset.y;
    this._billboardsHandler && this._billboardsHandler.setOffsetArr(this._billboardsHandlerIndex, offset);
};

og.Billboard.prototype.setSize = function (size) {
    this.size.x = size.x;
    this.size.y = size.y;
    this._billboardsHandler && this._billboardsHandler.setSizeArr(this._billboardsHandlerIndex, size);
};

og.Billboard.prototype.setAlignedAxis = function (alignedAxis) {
    if (this.alignedAxis) {
        this.alignedAxis.x = alignedAxis.x;
        this.alignedAxis.y = alignedAxis.y;
        this.alignedAxis.z = alignedAxis.z;
        this._billboardsHandler && this._billboardsHandler.setAlignedAxisArr(this._billboardsHandlerIndex, alignedAxis);
    } else {
        this.remove();
        this._billboardsHandler.alignedAxisBillboardsHandler.add(this);
    }
};

og.Billboard.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
    this._billboardsHandler && this._billboardsHandler.setVisibility(this._billboardsHandlerIndex, visibility);
};

og.Billboard.prototype.getVisibility = function () {
    return this.visibility;
};

og.Billboard.prototype.addTo = function (billboardCollection) {
    billboardCollection.add(this);
    return this;
};

og.Billboard.prototype.remove = function () {
    this._billboardsHandler && this._billboardsHandler.remove(this);
};