goog.provide('og.TextureAtlas');
goog.provide('og.TextureAtlasNode');

goog.require('og.ImageCanvas');
goog.require('og.Rectangle');


/**
 *
 *
 *
 **/
og.TextureAtlasNode = function (rect) {
    this.childNodes = null;
    this.image = null;
    this.rect = rect;
    this.texCoords = new Array(8);
};

/**
  * source: http://www.blackpawn.com/texts/lightmaps/default.html
  *
 **/
og.TextureAtlasNode.prototype.insert = function (img) {

    if (this.childNodes) {

        var newNode = this.childNodes[0].insert(img);

        if (newNode != null)
            return newNode;

        return this.childNodes[1].insert(img);

    } else {

        if (this.image != null)
            return null;

        var rc = this.rect;
        var w = img.width + 4;
        var h = img.height + 4;

        if (w > rc.getWidth() || h > rc.getHeight())
            return null;

        if (rc.fit(w, h)) {
            this.image = img;
            return this;
        }

        this.childNodes = new Array(2);
        this.childNodes[0] = new og.TextureAtlasNode();
        this.childNodes[1] = new og.TextureAtlasNode();

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
og.TextureAtlas = function () {
    this._handler = null;
    this.texture = null;
    this.canvas = new og.ImageCanvas(1024, 1024);
    this.clearCanvas();
    this._images = [];
    this._nodes = [];
    this._btree = null;
};

og.TextureAtlas.prototype.getImage = function () {
    return this.canvas.getImage();
};

og.TextureAtlas.prototype.getCanvas = function () {
    return this.canvas._canvas;
};

og.TextureAtlas.prototype.clearCanvas = function () {
    this.canvas.fillColor("rgba(0,0,0,0)");
};

og.TextureAtlas.prototype.assignHandler = function (handler) {
    this._handler = handler;
};

og.TextureAtlas.getDiagonal = function (image) {
    var w = image.width,
        h = image.height;
    return Math.sqrt(w * w + h * h);
};

og.TextureAtlas.prototype.addImage = function (image) {

    this.clearCanvas();

    if (!(image.width && image.height)) {
        return;
    }

    this._images.push(image);

    this._makeAtlas();

    this.makeTexture();
};

og.TextureAtlas.prototype._makeAtlas = function () {

    var im = this._images.slice(0);

    im.sort(function (a, b) {
        return a.width - b.width || a.height - b.height;
    });

    var w = this.canvas.getWidth(),
        h = this.canvas.getHeight();
    this._btree = new og.TextureAtlasNode(new og.Rectangle(0, 0, w, h));

    var newNodes = [];
    for (var i = 0; i < im.length; i++) {
        var node = this._btree.insert(im[i]);
        var r = node.rect;
        this.canvas.drawImage(node.image, r.left + 2, r.top + 2);
        var tc = node.texCoords;
        tc[0] = (r.left + 2) / w;
        tc[1] = (r.top + 2) / h;
        tc[2] = (r.right - 2) / w;
        tc[3] = (r.top + 2) / h;
        tc[4] = (r.left + 2) / w;
        tc[5] = (r.bottom - 2) / h;
        tc[6] = (r.right - 2) / w;
        tc[7] = (r.bottom - 2) / h;
        newNodes[node.image.__nodeIndex] = node;
    }
    this._nodes = [];
    this._nodes = newNodes;
};

og.TextureAtlas.prototype.makeTexture = function () {
    if (this._handler) {
        this._handler.gl.deleteTexture(this.texture);
        this.texture = this._handler.createTexture_mm(this.canvas._canvas);
    }
};