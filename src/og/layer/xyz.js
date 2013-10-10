goog.provide('og.layer.XYZ');

goog.require('og.layer.Layer');
goog.require('og.quadTree');
goog.require('og._class_');

og.layer.XYZ = function (name, options) {
    og.layer.XYZ.superclass.constructor.call(this, name, options);
};

og._class_.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.prototype.handleSegmentTile = function (material) {
    if (this.counter >= this.MAX_LOADING_TILES) {
        this.pendingsQueue.push(material);
    } else {
        this.loadSegmentTileImage(material);
    }
};

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.layer.replaceTemplate(this.url, { "tilex": segment.tileX.toString(), "tiley": segment.tileY.toString(), "zoom": segment.zoomIndex.toString() });
};

og.layer.XYZ.prototype.loadSegmentTileImage = function (material) {
    var that = this;
    this.counter++;
    var img = new Image();
    img.crossOrigin = '';
    img.onload = function () {
        material.applyTexture.call(material, this);
        that.dequeueRequest();
    };

    img.onerror = function () {
        if (material) {
            material.textureNotExists.call(material);
        }
        that.dequeueRequest();
    };

    img.src = this.GetHTTPRequestString(material.segment);
};

og.layer.XYZ.prototype.dequeueRequest = function () {
    this.counter--;
    if (this.pendingsQueue.length) {
        if (this.counter < this.MAX_LOADING_TILES) {
            var pmat;
            if (pmat = this.whilePendings())
                this.loadSegmentTileImage.call(this, pmat);
        }
    }
};

og.layer.XYZ.prototype.whilePendings = function () {
    while (this.pendingsQueue.length) {
        var pmat = this.pendingsQueue.pop();
        if (pmat) {
            if (pmat.segment.node.getState() != og.quadTree.NOTRENDERING) {
                return pmat;
            } else {
                pmat.imageIsLoading = false;
            }
        }
    }
    return null;
};