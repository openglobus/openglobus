goog.provide('og.ImageBillboard');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');


/**
 *
 *
 *
 */
og.ImageBillboard = function (billboard) {

    og.inheritance.base(this, billboard);

    this.src = null;
    this.image = null;
    this.width = 0;
    this.height = 0;
};

og.inheritance.extend(og.ImageBillboard, og.BaseBillboard);

og.ImageBillboard.prototype.setSrc = function (src) {
    this._src = src;
    var bh = this._billboardsHandler;
    if (bh && src) {
        var rn = bh._billboardsCollection.renderNode;
        if (rn) {
            var ta = rn.billboardsTextureAtlas;
            var that = this;
            ta.loadImage(src, function (img) {
                if (ta.nodes[img.__nodeIndex]) {
                    that.image = img;
                    bh.setTexCoordArr(that._billboardsHandlerIndex, ta.nodes[that.image.__nodeIndex].texCoords);
                } else {
                    ta.addImage(img);
                    that.image = img;
                    rn.updateBillboardsTexCoords();
                }
            });
        }
    }
};

og.ImageBillboard.prototype.setSize = function (width, height) {
    this.width = width;
    this.height = height;
    this._billboardsHandler && this._billboardsHandler.setSizeArr(this._billboardsHandlerIndex, new og.math.Vector2(width, height));
};