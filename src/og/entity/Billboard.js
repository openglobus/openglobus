/**
 * @module og/entity/Billboard
 */

"use strict";

import { BaseBillboard } from "./BaseBillboard.js";

/**
 * Represents basic quad billboard image.
 * @class
 * @extends {BaseBillboard}
 * @param {Object} [options] - Options:
 * @param {Vec3|Array.<number>} [options.position] - Billboard spatial position.
 * @param {number} [options.rotation] - Screen angle rotaion.
 * @param {Vec4|string|Array.<number>} [options.color] - Billboard color.
 * @param {Vec3|Array.<number>} [options.alignedAxis] - Billboard aligned vector.
 * @param {Vec3|Array.<number>} [options.offset] - Billboard center screen offset.
 * @param {boolean} [options.visibility] - Visibility.
 * @param {string} [options.src] - Billboard image url source.
 * @param {Image} [options.image] - Billboard image object.
 * @param {number} [options.width] - Screen width.
 * @param {number} [options.height] - Screen height.
 * @param {number} [options.scale] - Billboard scale.
 */
class Billboard extends BaseBillboard {
    constructor(options) {
        super(options);

        options = options || {};

        /**
         * Image src.
         * @protected
         * @type {string}
         */
        this._src = options.src || null;

        /**
         * Image object.
         * @protected
         * @type {Object}
         */
        this._image = options.image || null;

        this._scale = 1.0;

        /**
         * Billboard screen width.
         * @protected
         * @type {number}
         */
        this._width = options.width || (options.size ? options.size[0] : 30);

        /**
         * Billboard screen height.
         * @protected
         * @type {number}
         */
        this._height = options.height || (options.size ? options.size[1] : 30);
    }

    /**
     * Sets billboard image url source.
     * @public
     * @param {string} src - Image url.
     */
    setSrc(src) {
        this._src = src;
        var bh = this._handler;
        if (bh && src) {
            var rn = bh._entityCollection.renderNode;
            if (rn) {
                var ta = rn.renderer.billboardsTextureAtlas;
                var that = this;
                ta.loadImage(src, function (img) {
                    if (ta.get(img.__nodeIndex)) {
                        that._image = img;
                        bh.setTexCoordArr(
                            that._handlerIndex,
                            ta.get(that._image.__nodeIndex).texCoords
                        );
                    } else {
                        ta.addImage(img);
                        ta.createTexture();
                        that._image = img;
                        rn.updateBillboardsTexCoords();
                    }
                });
            }
        }
    }

    /**
     * Sets image object.
     * @public
     * @param {Object} image - JavaScript image object.
     */
    setImage(image) {
        this.setSrc(image.src);
    }

    /**
     * Sets billboard screen size in pixels.
     * @public
     * @param {number} width - Billboard width.
     * @param {number} height - Billboard height.
     */
    setSize(width, height) {
        this._width = width;
        this._height = height;
        this._handler &&
            this._handler.setSizeArr(this._handlerIndex, width * this._scale, height * this._scale);
    }

    /**
     * Returns billboard screen size.
     * @public
     * @returns {Object}
     */
    getSize() {
        return {
            width: this._width,
            height: this._height
        };
    }

    /**
     * Sets billboard screen width.
     * @public
     * @param {number} width - Width.
     */
    setWidth(width) {
        this.setSize(width, this._height);
    }

    /**
     * Gets billboard screen width.
     * @public
     * @returns {number}
     */
    getWidth() {
        return this._width;
    }

    /**
     * Sets billboard screen heigh.
     * @public
     * @param {number} height - Height.
     */
    setHeight(height) {
        this.setSize(this._width, height);
    }

    /**
     * Gets billboard screen height.
     * @public
     * @returns {number}
     */
    getHeight() {
        return this._height;
    }
}

export { Billboard };
