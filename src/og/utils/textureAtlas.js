goog.provide('og.utils.TextureAtlas');
goog.provide('og.utils.TextureAtlasNode');

goog.require('og.ImageCanvas');
goog.require('og.Rectangle');
goog.require('og.utils.ImagesCacheManager');


/**
 *
 *
 *
 **/
og.utils.TextureAtlasNode = function (rect) {
    this.childNodes = null;
    this.image = null;
    this.rect = rect;
    this.texCoords = new Array(8);
    this.atlas = null;
};

/**
  * source: http://www.blackpawn.com/texts/lightmaps/default.html
  *
 **/
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

/**
 *
 *
 *
 **/
og.utils.TextureAtlas = function (width, height) {
    this._handler = null;
    this.texture = null;
    this.canvas = new og.ImageCanvas(width || 1024, height || 1024);
    this.clearCanvas();
    this._images = [];
    this.nodes = [];
    this._btree = null;
    this._imagesCacheManager = new og.utils.ImagesCacheManager();
    this.borderSize = 4;
};

og.utils.TextureAtlas.BORDER_SIZE = 4;

og.utils.TextureAtlas.prototype.getImage = function () {
    return this.canvas.getImage();
};

og.utils.TextureAtlas.prototype.getCanvas = function () {
    return this.canvas._canvas;
};

og.utils.TextureAtlas.prototype.clearCanvas = function () {
    this.canvas.fillEmpty("black");
};

og.utils.TextureAtlas.prototype.assignHandler = function (handler) {
    this._handler = handler;
    this.createTexture();
};

og.utils.TextureAtlas.getDiagonal = function (image) {
    var w = image.atlasWidth || image.width,
        h = image.atlasHeight || image.height;
    return Math.sqrt(w * w + h * h);
};

og.utils.TextureAtlas.prototype.addImage = function (image, fastInsert) {

    if (!(image.width && image.height)) {
        return;
    }

    this._images.push(image);

    this._makeAtlas(fastInsert);

    return this.nodes[image.__nodeIndex];
};

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

og.utils.TextureAtlas.prototype.createTexture = function () {
    if (this._handler) {
        this._handler.gl.deleteTexture(this.texture);
        this.texture = this._handler.createTexture(this.canvas._canvas);
    }
};

og.utils.TextureAtlas.prototype.loadImage = function (src, success) {
    this._imagesCacheManager.load(src, success);
};