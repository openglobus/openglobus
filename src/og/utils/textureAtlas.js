goog.provide('og.utils.TextureAtlas');
goog.provide('og.utils.TextureAtlasNode');

goog.require('og.ImageCanvas');
goog.require('og.Rectangle');
goog.require('og.utils.ImagesCacheManager');


/**
 * Texture atlas stores images in one texture. Each image has texture 
 * coordinates returned with node creation by addImage function.
 * @class
 * @param {number} [width] - Texture atlas width, if it hasn't 1024 default.
 * @param {number} [height] - Texture atlas height, if it hasn't 1024 default..
 */
og.utils.TextureAtlas = function (width, height) {

    /**
     * Atlas nodes where input images store. It can be access by image.__nodeIndex.
     * @public
     * @type {Array.<og.utils.TextureAtlasNode >}
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
    this.canvas = new og.ImageCanvas(width || 1024, height || 1024);
    this.clearCanvas();

    this._handler = null;
    this._images = [];
    this._btree = null;
    this._imagesCacheManager = new og.utils.ImagesCacheManager();
    this.borderSize = 4;
};

/**
 * Border beetween stored images.
 * @type {number}
 * @const
 */
og.utils.TextureAtlas.BORDER_SIZE = 4;

/**
 * Returns atlas image object.
 * @public
 * @returns {Image}
 */
og.utils.TextureAtlas.prototype.getImage = function () {
    return this.canvas.getImage();
};

/**
 * Returns canvas object.
 * @public
 * @retuns {Canvas}
 */
og.utils.TextureAtlas.prototype.getCanvas = function () {
    return this.canvas._canvas;
};

/**
 * Clear atlas with black.
 * @public
 */
og.utils.TextureAtlas.prototype.clearCanvas = function () {
    this.canvas.fillEmpty("black");
};

/**
 * Sets openglobus gl handler that creates gl texture.
 * @public
 * @param {og.webgl.Handler} handler - WebGL handler.
 */
og.utils.TextureAtlas.prototype.assignHandler = function (handler) {
    this._handler = handler;
    this.createTexture();
};

/**
 * Returns image diagonal size.
 * @param {Image} image - Image.
 * @returns {number}
 */
og.utils.TextureAtlas.getDiagonal = function (image) {
    var w = image.atlasWidth || image.width,
        h = image.atlasHeight || image.height;
    return Math.sqrt(w * w + h * h);
};

/**
 * Adds image to the atlas and returns creted node with texture coordinates of the stored image.
 * @public
 * @param {Image} image - Input image.
 * @param {boolean} [fastInsert] - If it's true atlas doesnt restore all images again 
 * and store image in the curent atlas sheme.
 * @returns {og.utils.TextureAtlasNode}
 */
og.utils.TextureAtlas.prototype.addImage = function (image, fastInsert) {

    if (!(image.width && image.height)) {
        return;
    }

    this._images.push(image);

    this._makeAtlas(fastInsert);

    return this.nodes[image.__nodeIndex];
};

/**
 * Calculate texture coordianates and stores node.
 * @private
 */
og.utils.TextureAtlas.prototype._completeNode = function (nodes, node) {
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
};

/**
 * Main atlas making function.
 * @private
 * @param {boolean} [fastInsert] - If it's true atlas doesnt restore all images again 
 * and store image in the curent atlas sheme.
 */
og.utils.TextureAtlas.prototype._makeAtlas = function (fastInsert) {

    if (fastInsert && this._btree) {
        var im = this._images[this._images.length - 1];
        this._completeNode(this.nodes, this._btree.insert(im));
    } else {
        var im = this._images.slice(0);

        im.sort(function (b, a) {
            return ((a.atlasWidth || a.width) - (b.atlasWidth || b.width)) || ((a.atlasHeight || a.height) - (b.atlasHeight || b.height));
        });

        this._btree = new og.utils.TextureAtlasNode(new og.Rectangle(0, 0, this.canvas.getWidth(), this.canvas.getHeight()));
        this._btree.atlas = this;

        this.clearCanvas();

        var newNodes = [];
        for (var i = 0; i < im.length; i++) {
            this._completeNode(newNodes, this._btree.insert(im[i]));
        }
        this.nodes = [];
        this.nodes = newNodes;
    }
};

/**
 * Creates atlas gl texture.
 * @public
 */
og.utils.TextureAtlas.prototype.createTexture = function () {
    if (this._handler) {
        this._handler.gl.deleteTexture(this.texture);
        this.texture = this._handler.createTexture(this.canvas._canvas);
    }
};

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
og.utils.TextureAtlas.prototype.loadImage = function (src, success) {
    this._imagesCacheManager.load(src, success);
};

/**
 * Atlas binary tree node.
 * @class
 * @prarm {og.Rectangle} rect - Node image rectangle.
 */
og.utils.TextureAtlasNode = function (rect) {
    this.childNodes = null;
    this.image = null;
    this.rect = rect;
    this.texCoords = new Array(8);
    this.atlas = null;
};

/**
 * This algorithm has got from here:
 * http://www.blackpawn.com/texts/lightmaps/default.html
 */
og.utils.TextureAtlasNode.prototype.insert = function (img) {

    if (this.childNodes) {

        var newNode = this.childNodes[0].insert(img);

        if (newNode != null)
            return newNode;

        return this.childNodes[1].insert(img);

    } else {

        if (this.image != null)
            return null;

        var rc = this.rect;
        var w = (img.atlasWidth || img.width) + this.atlas.borderSize;
        var h = (img.atlasHeight || img.height) + this.atlas.borderSize;

        if (w > rc.getWidth() || h > rc.getHeight())
            return null;

        if (rc.fit(w, h)) {
            this.image = img;
            return this;
        }

        this.childNodes = new Array(2);
        this.childNodes[0] = new og.utils.TextureAtlasNode();
        this.childNodes[0].atlas = this.atlas;
        this.childNodes[1] = new og.utils.TextureAtlasNode();
        this.childNodes[1].atlas = this.atlas;

        var dw = rc.getWidth() - w;
        var dh = rc.getHeight() - h;

        if (dw > dh) {
            this.childNodes[0].rect = new og.Rectangle(rc.left, rc.top, rc.left + w, rc.bottom);
            this.childNodes[1].rect = new og.Rectangle(rc.left + w, rc.top, rc.right, rc.bottom);
        } else {
            this.childNodes[0].rect = new og.Rectangle(rc.left, rc.top, rc.right, rc.top + h);
            this.childNodes[1].rect = new og.Rectangle(rc.left, rc.top + h, rc.right, rc.bottom);
        }

        return this.childNodes[0].insert(img);
    }

};