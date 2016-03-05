goog.provide('og.Billboard');

goog.require('og.BaseBillboard');
goog.require('og.inheritance');
goog.require('og.math.Vector2');


/**
 * Represents basic quad billboard image.
 * @class
 * @extends {og.BaseBillboard}
 * @param {Object} [options] - Options:
 * @param {og.math.Vector3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotaion.
 * @param {og.math.Vector4|string|Array.<number>} [options.color] - Billboard color.
 * @param {og.math.Vector3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {og.math.Vector3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.src] - Billboard image url source.
 * @param {Image} [options.image] - Billboard image object.
 * @param {number} [options.width] - Screen width.
 * @param {number} [options.height] - Screen height.
 * @param {number} [options.scale] - Billboard scale.
 */
og.Billboard = function (options) {
    options = options || {};

    og.inheritance.base(this, options);

    this._src = options.src || null;
    this._image = options.image || null;
    this._width = options.width || (options.size ? options.size.x : 0);
    this._height = options.height || (options.size ? options.size.y : 0);
};

og.inheritance.extend(og.Billboard, og.BaseBillboard);

/**
 * Sets billboard image url source.
 * @public
 * @param {string} src - Image url.
 */
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

/**
 * Sets image.
 * @public
 * @param {Image} image - JavaScript image object.
 */
og.Billboard.prototype.setImage = function (image) {
    this.setSrc(image.src);
};

/**
 * Sets billboard screen size in pixels.
 * @public
 * @param {number} width - Billboard width.
 * @param {number} height - Billboard height.
 */
og.Billboard.prototype.setSize = function (width, height) {
    this._width = width;
    this._height = height;
    this._handler && this._handler.setSizeArr(this._handlerIndex, width * this._scale, height * this._scale);
};

/**
 * Returns billboard screen size.
 * @public
 * @returns {Object}
 */
og.Billboard.prototype.getSize = function () {
    return {
        "width": this._width,
        "height": this._height
    };
};

/**
 * Sets billboard width.
 * @public
 * @param {number} width - Width.
 */
og.Billboard.prototype.setWidth = function (width) {
    this.setSize(width, this._height);
};

/**
 * Gets billboard width.
 * @public
 * @returns {number}
 */
og.Billboard.prototype.getWidth = function () {
    return this._width;
};

/**
 * Sets billboard heigh.
 * @public
 * @param {number} height - Height.
 */
og.Billboard.prototype.setHeight = function (height) {
    this.setSize(this._width, height);
};

/**
 * Gets billboard height.
 * @public
 * @returns {number}
 */
og.Billboard.prototype.getHeight = function () {
    return this._height;
};