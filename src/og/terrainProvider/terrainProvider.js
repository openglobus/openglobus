goog.provide('og.terrainProvider.TerrainProvider');

goog.require('og.terrainProvider.EmptyTerrainProvider');
goog.require('og.layer');
goog.require('og.quadTree');
goog.require('og.ajax');
goog.require('og.Events');
goog.require('og.proj.EPSG3857');
goog.require('og.inheritance');
goog.require('og.QueueArray');
goog.require('og.utils');

/**
 * Class that loads segment elevation data, converts it to the array and passes it to the planet segment.
 * @class
 * @extends {og.terrainProvider.EmptyTerrainProvider}
 * @param {string} [name=""] - Terrain provider name.
 * @param {Object} [options] - Provider options:
 * @param {number} [options.minZoom=3] - Minimal visible zoom index when terrain handler works.
 * @param {number} [options.minZoom=14] - Maximal visible zoom index when terrain handler works.
 * @param {string} [options.url="http://earth3.openglobus.org/{z}/{y}/{x}.ddm"] - Terrain source path url template. Default is openglobus ddm elevation file.
 * @param {Array.<number>} [options.gridSizeByZoom] - Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
 * @param {number} [options.fileGridSize=32] - Elevation tile grid size. Default is 32x32.
 * @param {string} [options.responseType="arraybuffer"] - Ajax responce type.
 * @param {number} [options.MAX_LOADING_TILES] - Maximum at one time loading tiles.
 * @fires og.terrainProvider.TerrainProvider#load
 * @fires og.terrainProvider.TerrainProvider#loadend
 */
og.terrainProvider.TerrainProvider = function (name, options) {
    og.inheritance.base(this);
    options = options || {};

    /**
     * Provider name.
     * @public
     * @type {string}
     */
    this.name = name || "";

    /**
     * Minimal visible zoom index when terrain handler works.
     * @public
     * @type {number}
     */
    this.minZoom = options.minZoom || 3;

    /**
     * Maximal visible zoom index when terrain handler works.
     * @public
     * @type {number}
     */
    this.maxZoom = options.maxZoom || 14;

    /**
     * Terrain source path url template. 
     * @public
     * @type {string}
     */
    this.url = options.url || "http://earth3.openglobus.org/{z}/{y}/{x}.ddm";

    /**
     * Array of segment triangulation grid sizes where array index agreed to the segment zoom index.
     * @public
     * @type {Array.<number>}
     */
    this.gridSizeByZoom = options.gridSizeByZoom || [64, 32, 32, 16, 16, 8, 8, 8, 8, 16, 16, 16, 16, 32, 32, 32, 32, 32, 32, 32, 32];

    /**
     * Elevation tile grid size.
     * @public
     * @type {number}
     */
    this.fileGridSize = options.fileGridSize || 32;

    /**
     * Ajax elevation data tile query responce type.
     * @public
     * @type {string}
     */
    this.responseType = options.responseType || "arraybuffer";

    /**
     * Maximum at one time loading tiles.
     * @public
     * @number
     */
    this.MAX_LOADING_TILES = options.MAX_LOADING_TILES || 4;

    /**
     * Events handler.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
    this.events.registerNames(og.terrainProvider.TerrainProvider.EVENT_NAMES);

    /**
     * Current loadings counter.
     * @protected
     * @type {number}
     */
    this._counter = 0;

    /**
     * Loading pending queue.
     * @protected
     * @type {Array.<og.planetSegment.Segment>}
     */
    this._pendingsQueue = [];//new og.QueueArray();

    /**
     * Rewrites elevation storage url query.
     * @private
     * @callback og.terrainProvider.TerrainProvider~_urlRewriteCallback
     * @param {og.planetSegment.Segment} segment - Segment to load.
     * @param {string} url - Created url.
     * @returns {string} - Url query string.
     */
    this._urlRewriteCallback = null;
};

og.inheritance.extend(og.terrainProvider.TerrainProvider, og.terrainProvider.EmptyTerrainProvider);

og.terrainProvider.TerrainProvider.EVENT_NAMES = [
     /**
     * Triggered when current elevation tile has loaded but before rendereing.
     * @event og.terrainProvider.TerrainProvider#load
     */
    "load",

     /**
     * Triggered when all elevation tiles have loaded or loading has stopped.
     * @event og.terrainProvider.TerrainProvider#loadend
     */
    "loadend"
];

/**
 * Stop loading.
 * @public
 */
og.terrainProvider.TerrainProvider.prototype.abort = function () {
    this._pendingsQueue.length = 0;
};

/**
 * Sets terrain data url template.
 * @public
 * @param {string} url - Url template.
 * @example <caption>Default openglobus url template:</caption>:
 * "http://earth3.openglobus.org/{z}/{y}/{x}.ddm"
 */
og.terrainProvider.TerrainProvider.prototype.setUrl = function (url) {
    this.url = url;
};

/**
 * Sets provider name.
 * @public
 * @param {string} name - Name.
 */
og.terrainProvider.TerrainProvider.prototype.setName = function (name) {
    this.name = name;
};

/**
 * Starts to load segment data.
 * @public
 * @virtual
 * @param {og.planetSegment.Segment} segment - Segment that wants a terrain data.
 */
og.terrainProvider.TerrainProvider.prototype.handleSegmentTerrain = function (segment) {
    if (this._planet.terrainLock.isFree()) {
        segment.terrainReady = false;
        segment.terrainIsLoading = true;
        if (segment._projection.id == og.proj.EPSG3857.id) {
            if (this._counter >= this.MAX_LOADING_TILES) {
                this._pendingsQueue.push(segment);
            } else {
                this._exec(segment);
            }
        } else {
            //TODO: poles elevation
        }
    } else {
        segment.terrainIsLoading = false;
    }
};

/**
 * Creates query url.
 * @protected
 * @virtual
 * @param {og.planetSegment.Segment}
 */
og.terrainProvider.TerrainProvider.prototype._createUrl = function (segment) {
    return og.utils.stringTemplate(this.url, {
        "x": segment.tileX.toString(),
        "y": segment.tileY.toString(),
        "z": segment.tileZoom.toString()
    });
};

/**
 * Returns actual url query string.
 * @protected
 * @param {og.planetSegment.Segment} segment - Segment that loads elevation data.
 * @returns {string}
 */
og.terrainProvider.TerrainProvider.prototype._getHTTPRequestString = function (segment) {
    var url = this._createUrl(segment);
    return this._urlRewriteCallback ? this._urlRewriteCallback(segment, url) : url;
};

/**
 * Sets url rewrite callback, used for custom url rewriting for every tile laoding.
 * @public
 * @param {og.terrainProvider.TerrainProvider~_urlRewriteCallback} ur - The callback that returns tile custom created url.
 */
og.terrainProvider.TerrainProvider.prototype.setUrlRewriteCallback = function (ur) {
    this._urlRewriteCallback = ur;
};

/**
 * Method that converts loaded elevation data to segment elevation data type(columr major elevation data array in meters)
 * @public
 * @virtual
 * @param {*} data - Loaded elevation data.
 * @returns {Array.<number>}
 */
og.terrainProvider.TerrainProvider.prototype.getElevations = function (data) {
    return new Float32Array(data);
};

/**
 * Loads elevation data and apply it to the planet segment.
 * @protected
 * @param {og.planetSegment.Material} material - Loads material image.
 */
og.terrainProvider.TerrainProvider.prototype._exec = function (segment) {
    this._counter++;
    var xhr = og.ajax.request(this._getHTTPRequestString(segment), {
        responseType: this.responseType,
        sender: this,
        success: function (data) {
            this._applyElevationsData(segment, data);
        },
        error: function () {
            this._applyElevationsData(segment, []);
        },
        abort: function () {
            segment.terrainIsLoading = false;
        }
    });
};

/**
 * @protected
 * @param {og.planetSegment.Segment} segment
 * @param {*} data
 */
og.terrainProvider.TerrainProvider.prototype._applyElevationsData = function (segment, data) {
    if (segment) {
        var elevations = this.getElevations(data);
        var e = this.events.load;
        if (e.length) {
            this.events.dispatch(e, {
                "elevations": elevations,
                "segment": segment
            });
        }
        segment.applyTerrain(elevations);
    }
    this._dequeueRequest();
};

og.terrainProvider.TerrainProvider.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length) {
        if (this._counter < this.MAX_LOADING_TILES) {
            var pseg;
            if (pseg = this._whilePendings())
                this._exec.call(this, pseg);
        }
    } else if (this._counter === 0) {
        this.events.dispatch(this.events.loadend);
    }
};

og.terrainProvider.TerrainProvider.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        var pseg = this._pendingsQueue.pop();
        if (pseg.node) {
            if (pseg.ready && pseg.node.getState() !== og.quadTree.NOTRENDERING) {
                return pseg;
            }
            pseg.terrainIsLoading = false;
        }
    }
    return null;
};