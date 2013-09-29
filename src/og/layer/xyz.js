goog.provide('og.layer.XYZ');

goog.require('og.layer.Layer');
goog.require('og.quadTree');
goog.require('og._class_');

og.layer.XYZ = function (name, options) {
    og.layer.XYZ.superclass.constructor.call(this, name, options);
};

og._class_.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.prototype.handleSegmentTile = function (segment) {
    if (this.counter >= this.MAX_LOADING_TILES) {
        this.pendingsQueue.push(segment);
    } else {
        this.loadSegmentTileImage(segment);
    }
};

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.layer.replaceTemplate(this.url, { "tilex": segment.tileX.toString(), "tiley": segment.tileY.toString(), "zoom": segment.zoomIndex.toString() });
};

og.layer.XYZ.prototype.loadSegmentTileImage = function (segment) {
    var that = this;
    this.counter++;
    var img = new Image();
    img.crossOrigin = '';
    img.onload = function () {
        segment.applyTexture.call(segment, this);
        that.dequeueRequest();
    };

    img.onerror = function () {
        if (segment) {
            segment.textureNotExists.call(segment);
        }
        that.dequeueRequest();
    };

    img.src = this.GetHTTPRequestString(segment);
};

og.layer.XYZ.prototype.dequeueRequest = function () {
    this.counter--;
    if (this.pendingsQueue.length) {
        if (this.counter < this.MAX_LOADING_TILES) {
            var pseg;
            if (pseg = this.whilePendings())
                this.loadSegmentTileImage.call(this, pseg);
        }
    }
};

og.layer.XYZ.prototype.whilePendings = function () {
    while (this.pendingsQueue.length) {
        var pseg = this.pendingsQueue.pop();
        if (pseg) {
            if (pseg.node.getState() != og.quadTree.NOTRENDERING) {
                return pseg;
            } else {
                pseg.imageIsLoading = false;
            }
        }
    }
    return null;
};