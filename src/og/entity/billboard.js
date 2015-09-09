goog.provide('og.Billboard');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector2');


/**
 *
 *
 *
 */
og.Billboard = function (options) {

    og.inheritance.base(this, options);

    this.src = null;
    this.image = null;
    this.width = 0;
    this.height = 0;
};

og.inheritance.extend(og.Billboard, og.BaseBillboard);

og.Billboard.prototype.setSrc = function (src) {
    this.src = src;
    var bh = this._billboardHandler;
    if (bh && src) {
        var rn = bh._entityCollection.renderNode;
        if (rn) {
            var ta = rn.billboardsTextureAtlas;
            var that = this;
            ta.loadImage(src, function (img) {
                if (ta.nodes[img.__nodeIndex]) {
                    that.image = img;
                    bh.setTexCoordArr(that._billboardHandlerIndex, ta.nodes[that.image.__nodeIndex].texCoords);
                } else {
                    ta.addImage(img);
                    that.image = img;
                    rn.updateBillboardsTexCoords();
                }
            });
        }
    }
};

og.Billboard.prototype.setSize = function (width, height) {
    this.width = width;
    this.height = height;
    this._billboardHandler && this._billboardHandler.setSizeArr(this._billboardHandlerIndex, width, height);
};

og.Billboard.prototype.setWidth = function (width) {
    this.setSize(width, this.height);
};

og.Billboard.prototype.setHeight = function (height) {
    this.setSize(this.width, height);
};