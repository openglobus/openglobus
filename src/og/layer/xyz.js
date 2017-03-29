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
 *     url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
 *     visibility: true,
 *     attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>'
 * });
 */
og.layer.XYZ = function(name, options) {
    og.inheritance.base(this, name, options);

    this.events.registerNames(og.layer.XYZ.EVENT_NAMES);

    if (!options.extent) {
        this.setExtent(new og.Extent(new og.LonLat(-180.0, og.mercator.MIN_LAT), new og.LonLat(180.0, og.mercator.MAX_LAT)));
    }

    this.transparentColor = options.transparentColor || [-1, -1, -1];

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
    this._pendingsQueue = []; //new og.QueueArray();

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
    "loadend"
];

/**
 * Creates imagery tile {@link og.layer.XYZ} layer instance.
 * @function
 * @param {string} name - Layer name.
 * @param {Object} options - Imagery layer options.
 */
og.layer.xyz = function(name, options) {
    return new og.layer.XYZ(name, options);
};

/**
 * Abort loading tiles.
 * @public
 */
og.layer.XYZ.prototype.abortLoading = function() {
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
og.layer.XYZ.prototype.setVisibility = function(visibility) {
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
 * http://b.tile.openstreetmap.org/{z}/{x}/{y}.png
 * where {z}, {x} and {y} - replaces by current tile values.
 */
og.layer.XYZ.prototype.setUrl = function(url) {
    this.url = url;
};

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} mateial
 */
og.layer.XYZ.prototype.loadMaterial = function(material) {

    var seg = material.segment;

    if (this._isBaseLayer) {
        material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
    } else {
        material.texture = seg.planet.transparentTexture;
    }

    if (this._planet.layersActivity) {
        material.isReady = false;
        material.isLoading = true;
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
og.layer.XYZ.prototype._createUrl = function(segment) {
    return og.utils.stringTemplate(this.url, {
        "x": segment.tileX.toString(),
        "y": segment.tileY.toString(),
        "z": segment.tileZoom.toString()
    });
};

/**
 * Returns actual url query string.
 * @protected
 * @param {og.planetSegment.Segment} segment - Segment that loads image data.
 * @returns {string}
 */
og.layer.XYZ.prototype._getHTTPRequestString = function(segment) {
    var url = this._createUrl(segment);
    return this._urlRewriteCallback ? this._urlRewriteCallback(segment, url) : url;
};

/**
 * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
 * @public
 * @param {og.layer.XYZ~_urlRewriteCallback} ur - The callback that returns tile custom created url.
 */
og.layer.XYZ.prototype.setUrlRewriteCallback = function(ur) {
    this._urlRewriteCallback = ur;
};

/**
 * Loads material image and apply it to the planet segment.
 * @protected
 * @param {og.planetSegment.Material} material - Loads material image.
 */
og.layer.XYZ.prototype._exec = function(material) {
    og.layer.XYZ.__requestsCounter++;
    this._counter++;

    material.image = new Image();
    material.image.crossOrigin = '';

    var that = this;
    material.image.onload = function() {
        that._counter--;
        og.layer.XYZ.__requestsCounter--;

        if (material.isLoading) {
            var e = that.events.load;
            if (e.length) {
                that.events.dispatch(e, material);
            }
            material.applyImage(this);
        }
        that._dequeueRequest();
    };

    material.image.onerror = function() {
        if (material.isLoading && material.image) {
            that._counter--;
            og.layer.XYZ.__requestsCounter--;
            material.textureNotExists.call(material);
        }
        that._dequeueRequest();
    };

    material.image.src = this._getHTTPRequestString(material.segment);
};

/**
 * Abort exact material loading.
 * @public
 * @param {og.planetSegment.Material} material - Segment material.
 */
og.layer.XYZ.prototype.abortMaterialLoading = function(material) {
    if (material.isLoading && material.image) {
        material.image.src = "";
        this._counter--;
        og.layer.XYZ.__requestsCounter--;
        this._dequeueRequest();
    }
    material.isLoading = false;
    material.isReady = false;
};

og.layer.XYZ.prototype._dequeueRequest = function() {
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

og.layer.XYZ.prototype._whilePendings = function() {
    while (this._pendingsQueue.length) {
        var pmat = this._pendingsQueue.pop();
        if (pmat.segment.node) {
            if (pmat.segment.ready && pmat.segment.node.getState() === og.quadTree.RENDERING) {
                return pmat;
            }
            pmat.isLoading = false;
        }
    }
    return null;
};


og.layer.XYZ.prototype.applyMaterial = function(material) {
    if (material.isReady) {
        return [0, 0, 1, 1];
    } else {

        !material.isLoading && this.loadMaterial(material);

        var segment = material.segment;
        var pn = segment.node,
            notEmpty = false;

        var mId = this._id;
        var psegm = material;
        while (pn.parentNode) {
            if (psegm && psegm.isReady) {
                notEmpty = true;
                break;
            }
            pn = pn.parentNode;
            psegm = pn.planetSegment.materials[mId];
        }

        if (notEmpty) {
            material.appliedNodeId = pn.nodeId;
            material.texture = psegm.texture;
            var dZ2 = 1.0 / (2 << (segment.tileZoom - pn.planetSegment.tileZoom - 1));
            return [
                segment.tileX * dZ2 - pn.planetSegment.tileX,
                segment.tileY * dZ2 - pn.planetSegment.tileY,
                dZ2,
                dZ2
            ];
        } else {
            material.texture = segment.planet.transparentTexture;
            return [0, 0, 1, 1];
        }
    }
};

og.layer.XYZ.prototype.clearMaterial = function(material) {
    if (material.isReady) {
        material.isReady = false;

        !material.texture.default &&
            material.segment.handler.gl.deleteTexture(material.texture);

        material.texture = null;
    }

    this.abortMaterialLoading(material);

    material.isLoading = false;
    material.textureExists = false;

    if (material.image) {
        material.image.onload = null;
        material.image.src = '';
        material.image = null;
    }
};

/**
 * @protected
 */
og.layer.XYZ.prototype._correctFullExtent = function() {
    var e = this._extent,
        em = this._extentMerc;
    var ENLARGE_MERCATOR_LON = og.mercator.POLE + 50000;
    var ENLARGE_MERCATOR_LAT = og.mercator.POLE + 50000;
    if (e.northEast.lat === 90.0) {
        em.northEast.lat = ENLARGE_MERCATOR_LAT;
    }
    if (e.northEast.lon === 180.0) {
        em.northEast.lon = ENLARGE_MERCATOR_LON;
    }
    if (e.southWest.lat === -90.0) {
        em.southWest.lat = -ENLARGE_MERCATOR_LAT;
    }
    if (e.southWest.lon === -180.0) {
        em.southWest.lon = -ENLARGE_MERCATOR_LON;
    }

    if (e.northEast.lat >= og.mercator.MAX_LAT) {
        e.northEast.lat = og.mercator.MAX_LAT;
    }

    if (e.northEast.lat <= og.mercator.MIN_LAT) {
        e.northEast.lat = og.mercator.MIN_LAT;
    }
};
