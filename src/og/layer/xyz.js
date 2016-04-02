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

    this._counter = 0;
    this._pendingsQueue = [];//new og.QueueArray();
};

og.inheritance.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.EVENT_NAMES = [
    "load",
    "loadend"];

og.layer.XYZ.prototype.abortLoading = function () {
    var q = this._pendingsQueue;
    for (var i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
        if (q._array[i]) {
            this.abortMaterialLoading(q._array[i]);
        }
    }
    this._pendingsQueue = [];
    //this._pendingsQueue.clear();
};

og.layer.XYZ.prototype.setVisibility = function (visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
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
    if (this._planet.layersActivity) {
        material.imageReady = false;
        material.imageIsLoading = true;
        if (material.segment._projection.id === og.proj.EPSG3857.id) {
            if (og.layer.XYZ.__requestsCounter >= og.layer.XYZ.MAX_REQUESTS && this._counter) {
                this._pendingsQueue.push(material);
            } else {
                this._exec(material);
            }
        } else {
            material.textureNotExists();
        }
    }
};

og.layer.XYZ.__requestsCounter = 0;
og.layer.XYZ.MAX_REQUESTS = 7;

og.layer.XYZ.prototype.GetHTTPRequestString = function (segment) {
    return og.utils.stringTemplate(this.url, {
        "tilex": segment.tileX.toString(),
        "tiley": segment.tileY.toString(),
        "zoom": segment.tileZoom.toString()
    });
};

og.layer.XYZ.prototype._exec = function (material) {
    og.layer.XYZ.__requestsCounter++;
    this._counter++;

    var that = this;
    material.image = new Image();
    material.image.crossOrigin = '';

    material.image.onload = function () {
        that._counter--;
        og.layer.XYZ.__requestsCounter--;

        var e = that.events.load;
        if (e.length) {
            that.events.dispatch(e, material);
        }
        material.applyTexture.call(material, this);
        that.dequeueRequest();
    };

    material.image.onerror = function () {
        if (material.imageIsLoading && material.image) {
            that._counter--;
            og.layer.XYZ.__requestsCounter--;
            material.textureNotExists.call(material);
        }
        that.dequeueRequest();
    };

    //if (material.segment.materials.length) {
    material.image.src = this.GetHTTPRequestString(material.segment);
    //material.image = img;
    //} else {
    //    this.dequeueRequest();
    //}
};

og.layer.XYZ.prototype.abortMaterialLoading = function (material) {
    if (material.imageIsLoading && material.image) {
        this._counter--;
        og.layer.XYZ.__requestsCounter--;
        this.dequeueRequest();
    }
};

og.layer.XYZ.prototype.dequeueRequest = function () {
    if (this._pendingsQueue.length) {
        if (og.layer.XYZ.__requestsCounter < og.layer.XYZ.MAX_REQUESTS) {
            var pmat;
            if (pmat = this.whilePendings())
                this._exec.call(this, pmat);
        }
    } else if (this._counter === 0) {
        this.events.dispatch(this.events.loadend);
    }
};

og.layer.XYZ.prototype.whilePendings = function () {
    while (this._pendingsQueue.length) {
        var pmat = this._pendingsQueue.pop();
        if (pmat.segment.node) {
            if (pmat.segment.ready && pmat.segment.node.getState() === og.quadTree.RENDERING) {
                return pmat;
            }
            pmat.imageIsLoading = false;
        }
    }
    return null;
};