goog.provide('og.layer.XYZ');

goog.require('og.layer.Layer');
goog.require('og.quadTree');

og.layer.XYZ = function (name, options) {
    og.base(this, name, options);
};

og.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.prototype.handleSegmentTile = function (material) {
    if (og.layer.requestsCounter >= og.layer.MAX_REQUESTS && this.counter) {
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
        that.events.callEvents(that.events.onload, {
            "image": this,
            "segment": material.segment
        });
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
    if (this.pendingsQueue.length && og.layer.requestsCounter < og.layer.MAX_REQUESTS) {
        var pmat;
        if (pmat = this.whilePendings())
            this.loadSegmentTileImage.call(this, pmat);
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