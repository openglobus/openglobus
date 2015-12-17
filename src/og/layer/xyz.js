goog.provide('og.layer.XYZ');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.quadTree');
goog.require('og.proj.EPSG3857');
goog.require('og.utils');

og.layer.XYZ = function (name, options) {
    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.XYZ.EVENT_NAMES);

    this.url = options.url || "";

    this.counter = 0;
    this.pendingsQueue = new og.QueueArray();
};

og.inheritance.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.EVENT_NAMES = [
    "load",
    "loadend"];

og.layer.XYZ.prototype.abortLoading = function () {
    var q = this.pendingsQueue;
    for (var i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
        if (q._array[i]) {
            q._array[i].abortLoading();
        }
    }
    this.pendingsQueue.clear();
};

og.layer.XYZ.prototype.setVisibility = function (visibility) {
    if (visibility != this.visibility) {
        this.visibility = visibility;
        if (this.isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        } else if (!visibility) {
            this.abortLoading();
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);
    }
};

og.layer.XYZ.prototype.setUrl = function (url) {
    this.url = url;
};

og.layer.XYZ.prototype.handleSegmentTile = function (material) {
    if (material.segment._projection.id == og.proj.EPSG3857.id) {
        if (og.layer.XYZ.__requestsCounter >= og.layer.XYZ.MAX_REQUESTS && this.counter) {
            this.pendingsQueue.push(material);
        } else {
            this.loadSegmentTileImage(material);
        }
    } else {
        material.textureNotExists();
    };
};

og.layer.XYZ.__requestsCounter = 0;
og.layer.XYZ.MAX_REQUESTS = 7;

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.utils.stringTemplate(this.url, {
        "tilex": segment.tileX.toString(),
        "tiley": segment.tileY.toString(),
        "zoom": segment.zoomIndex.toString()
    });
};

og.layer.XYZ.prototype.loadSegmentTileImage = function (material) {
    var that = this;
    this.counter++;
    og.layer.XYZ.__requestsCounter++;
    var img = new Image();
    img.crossOrigin = '';
    img.onload = function () {
        var e = that.events.load;
        if (e.length) {
            that.events.dispatch(e, {
                "image": this,
                "material": material
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
        material.image = img;
    } else {
        //Have to be that segment was clearified
        this.dequeueRequest();
    }
};

og.layer.XYZ.prototype.dequeueRequest = function () {
    this.counter--;
    og.layer.XYZ.__requestsCounter--;
    if (this.pendingsQueue.length) {
        if (og.layer.XYZ.__requestsCounter < og.layer.XYZ.MAX_REQUESTS) {
            var pmat;
            if (pmat = this.whilePendings())
                this.loadSegmentTileImage.call(this, pmat);
        }
    } else if (this.counter == 0) {
        this.events.dispatch(this.events.loadend);
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