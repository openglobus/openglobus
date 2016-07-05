goog.provide('og.layer.XYZ');

goog.require('og.inheritance');
goog.require('og.layer.Layer');
goog.require('og.quadTree');
goog.require('og.proj.EPSG3857');
goog.require('og.utils');

/**
 * Represents an imagery tiles source provider.
 * @class
 * @extends {og.layer.Layer}
 * @param {string} name - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} options.url - Tile url source template(see example below).
 * @fires og.layer.XYZ#load
 * @fires og.layer.XYZ#loadend
 *
 * @example <caption>Creates OpenStreetMap base tile layer</caption>
 * new og.layer.XYZ("OpenStreetMap", { 
 *     isBaseLayer: true,
 *     url: "http://b.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png",
 *     visibility: true, 
 *     attribution: 'Data © <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' 
 * });
 */
og.layer.XYZ = function (name, options) {
    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.XYZ.EVENT_NAMES);

    /**
     * Tile url source template.
     * @public
     * @type {string}
     */
    this.url = options.url || "";

    /**
     * Current loading tiles couter.
     * @protected
     * @type {number}
     */
    this._counter = 0;

    /**
     * Tile pending queue that waiting for loading.
     * @protected
     * @type {Array.<og.planetSegment.Material>}
     */
    this._pendingsQueue = [];//new og.QueueArray();

    /**
     * Rewrites imagery tile url query.
     * @private
     * @callback og.layer.XYZ~_urlRewriteCallback
     * @param {og.planetSegment.Segment} segment - Segment to load.
     * @param {string} url - Created url.
     * @returns {string} - Url query string.
     */
    this._urlRewriteCallback = null;
};

og.inheritance.extend(og.layer.XYZ, og.layer.Layer);

og.layer.XYZ.__requestsCounter = 0;

/**
 * Maximum loading queries at one time.
 * @const
 * @type {number}
 */
og.layer.XYZ.MAX_REQUESTS = 7;

og.layer.XYZ.EVENT_NAMES = [
     /**
     * Triggered when current tile image has loaded but before rendereing.
     * @event og.layer.XYZ#load
     */
    "load",

     /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.layer.XYZ#loadend
     */
    "loadend"];

/**
 * Creates imagery tile layer instance.
 * @function
 * @param {string} name - Layer name.
 * @param {Object} options - Imagery layer options.
 */
og.layer.xyz = function (name, options) {
    return new og.layer.XYZ(name, options);
};

/**
 * Abort loading tiles.
 * @public
 */
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

/**
 * Sets layer visibility.
 * @public
 * @param {boolean} visibility - Layer visibility.
 */
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

/**
 * Sets imagery tiles url source template.
 * @public
 * @param {string} url - Url template.
 * @example
 * http://b.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png
 * where {zoom}, {tilex} and {tiley} - replaces by current tile values.
 */
og.layer.XYZ.prototype.setUrl = function (url) {
    this.url = url;
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} mateial
 */
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

/**
 * Creates query url.
 * @protected
 * @virtual
 * @param {og.planetSegment.Segment}
 */
og.layer.XYZ.prototype._createUrl = function (segment) {
    return og.utils.stringTemplate(this.url, {
        "tilex": segment.tileX.toString(),
        "tiley": segment.tileY.toString(),
        "zoom": segment.tileZoom.toString()
    });
};

/**
 * Returns actual url query string.
 * @protected
 * @param {og.planetSegment.Segment} segment - Segment that loads image data.
 * @returns {string}
 */
og.layer.XYZ.prototype._getHTTPRequestString = function (segment) {
    var url = this._createUrl(segment);
    return this._urlRewriteCallback ? this._urlRewriteCallback(segment, url) : url;
};

/**
 * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
 * @public
 * @param {og.layer.XYZ~_urlRewriteCallback} ur - The callback that returns tile custom created url.
 */
og.layer.XYZ.prototype.setUrlRewriteCallback = function (ur) {
    this._urlRewriteCallback = ur;
};

/**
 * Loads material image and apply it to the planet segment.
 * @protected
 * @param {og.planetSegment.Material} material - Loads material image.
 */
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
        that._dequeueRequest();
    };

    material.image.onerror = function () {
        if (material.imageIsLoading && material.image) {
            that._counter--;
            og.layer.XYZ.__requestsCounter--;
            material.textureNotExists.call(material);
        }
        that._dequeueRequest();
    };

    //if (material.segment.materials.length) {
    material.image.src = this._getHTTPRequestString(material.segment);
    //material.image = img;
    //} else {
    //    this._dequeueRequest();
    //}
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.layer.XYZ.prototype.abortMaterialLoading = function (material) {
    if (material.imageIsLoading && material.image) {
        this._counter--;
        og.layer.XYZ.__requestsCounter--;
        this._dequeueRequest();
    }
};

og.layer.XYZ.prototype._dequeueRequest = function () {
    if (this._pendingsQueue.length) {
        if (og.layer.XYZ.__requestsCounter < og.layer.XYZ.MAX_REQUESTS) {
            var pmat;
            if (pmat = this._whilePendings())
                this._exec.call(this, pmat);
        }
    } else if (this._counter === 0) {
        this.events.dispatch(this.events.loadend);
    }
};

og.layer.XYZ.prototype._whilePendings = function () {
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