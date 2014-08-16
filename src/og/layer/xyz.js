goog.provide('og.layer.XYZ');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.quadTree');
goog.require('og.proj.EPSG3857');

og.layer.XYZ = function (name, options) {
    og.inheritance.base(this, name, options);
};

og.inheritance.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.prototype.handleSegmentTile = function (material) {
    if (material.segment._projection.id == og.proj.EPSG3857.id &&
        og.layer.requestsCounter >= og.layer.MAX_REQUESTS && this.counter) {
        this.pendingsQueue.push(material);
    } else {
        this.loadSegmentTileImage(material);
    }
};

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.layer.replaceTemplate(this.url, {
        "tilex": segment.tileX.toString(),
        "tiley": segment.tileY.toString(),
        "zoom": segment.zoomIndex.toString()
    });
};

og.layer.XYZ.prototype.loadSegmentTileImage = function (material) {
    var that = this;
    this.counter++;
    og.layer.requestsCounter++;
    var img = new Image();
    img.crossOrigin = '';
    img.onload = function () {
        var e = that.events.onload;
        if (e.length) {
            that.events.dispatch(e, {
                "image": this,
                "segment": material.segment
            });
        }
        material.applyTexture.call(material, this);
        that.dequeueRequest();
    };

    img.onerror = function () {
        if (material) {
            material.textureNotExists.call(material);
        }
        that.dequeueRequest();
    };

    if (material.segment.materials.length) {
        img.src = this.GetHTTPRequestString(material.segment);
    } else {
        //Have to be that segment was clearified
        this.dequeueRequest();
    }
};

og.layer.XYZ.prototype.dequeueRequest = function () {
    this.counter--;
    og.layer.requestsCounter--;
    if (this.pendingsQueue.length) {
        if (og.layer.requestsCounter < og.layer.MAX_REQUESTS) {
            var pmat;
            if (pmat = this.whilePendings())
                this.loadSegmentTileImage.call(this, pmat);
        }
    } else {
        this.events.dispatch(this.events.onloadend);
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