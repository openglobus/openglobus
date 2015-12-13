goog.provide('og.Billboard');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector2');


/**
 * Represents basic quad billboard image.
 * @class
 * @extends {og.BaseBillboard}
 * @param {Object} [options] -
 * TODO:
 */
og.Billboard = function (options) {

    og.inheritance.base(this, options);

    this._src = null;
    this._image = null;
    this._width = 0;
    this._height = 0;
    this._scale = 1.0;
};

og.inheritance.extend(og.Billboard, og.BaseBillboard);

og.Billboard.prototype.setSrc = function (src) {
    this._src = src;
    var bh = this._handler;
    if (bh && src) {
        var rn = bh._entityCollection.renderNode;
        if (rn) {
            var ta = rn.billboardsTextureAtlas;
            var that = this;
            ta.loadImage(src, function (img) {
                if (ta.nodes[img.__nodeIndex]) {
                    that._image = img;
                    bh.setTexCoordArr(that._handlerIndex, ta.nodes[that._image.__nodeIndex].texCoords);
                } else {
                    ta.addImage(img);
                    ta.createTexture();
                    that._image = img;
                    rn.updateBillboardsTexCoords();
                }
            });
        }
    }
};

og.Billboard.prototype.setImage = function (image) {
    this.setSrc(image.src);
};

og.Billboard.prototype.setSize = function (width, height) {
    this._width = width;
    this._height = height;
    this._handler && this._handler.setSizeArr(this._handlerIndex, width * this._scale, height * this._scale);
};

og.Billboard.prototype.setScale = function (scale) {
    this._scale = scale;
    this._handler && this._handler.setSizeArr(this._handlerIndex, this._width * scale, this._height * scale);
};

og.Billboard.prototype.setWidth = function (width) {
    this.setSize(width, this._height);
};

og.Billboard.prototype.setHeight = function (height) {
    this.setSize(this._width, height);
};