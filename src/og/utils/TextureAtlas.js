"use strict";

import { ImageCanvas } from "../ImageCanvas.js";
import { Rectangle } from "../Rectangle.js";
import { ImagesCacheManager } from "./ImagesCacheManager.js";

/**
 * Texture atlas stores images in one texture. Each image has its own
 * atlas texture coordinates.
 * @class
 * @param {number} [width] - Texture atlas width, if it hasn't 1024 default.
 * @param {number} [height] - Texture atlas height, if it hasn't 1024 default..
 */
class TextureAtlas {
    constructor(width, height) {
        /**
         * Atlas nodes where input images store. It can be access by image.__nodeIndex.
         * @public
         * @type {Array.<utils.TextureAtlasNode >}
         */
        this.nodes = [];

        /**
         * Created gl texture.
         * @public
         */
        this.texture = null;

        /**
         * Atlas canvas.
         * @public
         * @type {canvas}
         */
        this.canvas = new ImageCanvas(width || 1024, height || 1024);
        this.clearCanvas();

        this._handler = null;
        this._images = [];
        this._btree = null;
        this._imagesCacheManager = new ImagesCacheManager();
        this.borderSize = 4;
    }

    /**
     * Returns atlas javascript image object.
     * @public
     * @returns {Object} -
     */
    getImage() {
        return this.canvas.getImage();
    }

    /**
     * Returns canvas object.
     * @public
     * @returns {Object} -
     */
    getCanvas() {
        return this.canvas._canvas;
    }

    /**
     * Clear atlas with black.
     * @public
     */
    clearCanvas() {
        this.canvas.fillEmpty("black");
    }

    /**
     * Sets openglobus gl handler that creates gl texture.
     * @public
     * @param {Handler} handler - WebGL handler.
     */
    assignHandler(handler) {
        this._handler = handler;
        this.createTexture();
    }

    /**
     * Returns image diagonal size.
     * @param {Object} image - JavaSript image object.
     * @returns {number} -
     */
    getDiagonal(image) {
        var w = image.atlasWidth || image.width,
            h = image.atlasHeight || image.height;
        return Math.sqrt(w * w + h * h);
    }

    /**
     * Adds image to the atlas and returns creted node with texture coordinates of the stored image.
     * @public
     * @param {Object} image - Input javascript image object.
     * @param {boolean} [fastInsert] - If it's true atlas doesnt restore all images again
     * and store image in the curent atlas sheme.
     * @returns {utils.TextureAtlasNode} -
     */
    addImage(image, fastInsert) {
        if (!(image.width && image.height)) {
            return;
        }

        this._images.push(image);

        this._makeAtlas(fastInsert);

        return this.nodes[image.__nodeIndex];
    }

    _completeNode(nodes, node) {
        if (node) {
            var w = this.canvas.getWidth(),
                h = this.canvas.getHeight();
            var im = node.image;
            var r = node.rect;
            var bs = Math.round(this.borderSize * 0.5);
            this.canvas.drawImage(im, r.left + bs, r.top + bs, im.atlasWidth, im.atlasHeight);
            var tc = node.texCoords;

            tc[0] = (r.left + bs) / w;
            tc[1] = (r.top + bs) / h;

            tc[2] = (r.left + bs) / w;
            tc[3] = (r.bottom - bs) / h;

            tc[4] = (r.right - bs) / w;
            tc[5] = (r.bottom - bs) / h;

            tc[6] = (r.right - bs) / w;
            tc[7] = (r.bottom - bs) / h;

            tc[8] = (r.right - bs) / w;
            tc[9] = (r.top + bs) / h;

            tc[10] = (r.left + bs) / w;
            tc[11] = (r.top + bs) / h;

            nodes[im.__nodeIndex] = node;
        }
    }

    /**
     * Main atlas making function.
     * @private
     * @param {boolean} [fastInsert] - If it's true atlas doesnt restore all images again
     * and store image in the curent atlas sheme.
     */
    _makeAtlas(fastInsert) {
        if (fastInsert && this._btree) {
            let im = this._images[this._images.length - 1];
            this._completeNode(this.nodes, this._btree.insert(im));
        } else {
            let im = this._images.slice(0);

            im.sort(function (b, a) {
                return (
                    (a.atlasWidth || a.width) - (b.atlasWidth || b.width) ||
                    (a.atlasHeight || a.height) - (b.atlasHeight || b.height)
                );
            });

            this._btree = new TextureAtlasNode(
                new Rectangle(0, 0, this.canvas.getWidth(), this.canvas.getHeight())
            );
            this._btree.atlas = this;

            this.clearCanvas();

            var newNodes = [];
            for (var i = 0; i < im.length; i++) {
                this._completeNode(newNodes, this._btree.insert(im[i]));
            }
            this.nodes = [];
            this.nodes = newNodes;
        }
    }

    /**
     * Creates atlas gl texture.
     * @public
     */
    createTexture(img) {
        if (this._handler) {
            this._handler.gl.deleteTexture(this.texture);
            if (img) {
                this.canvas.resize(img.width, img.height);
                this.canvas.drawImage(img, 0, 0, img.width, img.height);
            }
            this.texture = this._handler.createTexture_l(this.canvas._canvas);
        }
    }

    /**
     * Image handler callback.
     * @callback Object~successCallback
     * @param {Image} img - Loaded image.
     */

    /**
     * Asynchronous function that loads and creates image to the image cache, and call success callback when it's done.
     * @public
     * @param {string} src - Image object src string.
     * @param {Object~successCallback} success - The callback that handles the image loads done.
     */
    loadImage(src, success) {
        this._imagesCacheManager.load(src, success);
    }

    getImageTexCoordinates(img) {
        if (img.__nodeIndex != null && this.nodes[img.__nodeIndex]) {
            return this.nodes[img.__nodeIndex].texCoords;
        }
    }
}

/**
 * Atlas binary tree node.
 * @class
 * @param {Rectangle} rect - Node image rectangle.
 */
class TextureAtlasNode {
    constructor(rect, texCoords) {
        this.childNodes = null;
        this.image = null;
        this.rect = rect;
        this.texCoords = texCoords || [];
        this.atlas = null;
    }

    insert(img) {
        if (this.childNodes) {
            var newNode = this.childNodes[0].insert(img);

            if (newNode != null) {
                return newNode;
            }

            return this.childNodes[1].insert(img);
        } else {
            if (this.image != null) {
                return null;
            }

            var rc = this.rect;
            var w = (img.atlasWidth || img.width) + this.atlas.borderSize;
            var h = (img.atlasHeight || img.height) + this.atlas.borderSize;

            if (w > rc.getWidth() || h > rc.getHeight()) {
                return null;
            }

            if (rc.fit(w, h)) {
                this.image = img;
                return this;
            }

            this.childNodes = new Array(2);
            this.childNodes[0] = new TextureAtlasNode();
            this.childNodes[0].atlas = this.atlas;
            this.childNodes[1] = new TextureAtlasNode();
            this.childNodes[1].atlas = this.atlas;

            var dw = rc.getWidth() - w;
            var dh = rc.getHeight() - h;

            if (dw > dh) {
                this.childNodes[0].rect = new Rectangle(rc.left, rc.top, rc.left + w, rc.bottom);
                this.childNodes[1].rect = new Rectangle(rc.left + w, rc.top, rc.right, rc.bottom);
            } else {
                this.childNodes[0].rect = new Rectangle(rc.left, rc.top, rc.right, rc.top + h);
                this.childNodes[1].rect = new Rectangle(rc.left, rc.top + h, rc.right, rc.bottom);
            }

            return this.childNodes[0].insert(img);
        }
    }
}

export { TextureAtlas, TextureAtlasNode };
