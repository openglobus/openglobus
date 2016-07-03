goog.provide('og.layer.WMS');

goog.require('og.inheritance');
goog.require('og.layer.XYZ');

/**
 * Used to display WMS services as tile layers on the globe.
 * @class
 * @extends {og.layer.XYZ}
 * //TODO: WMS version, format, and custom srs cpecification.
 * @param {string} name - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {string} options.url - WMS url source.
 * @param {number} [options.width=256] - Tile width.
 * @param {number} [options.height=256] - Tile height.
 * @param {string} options.layers - WMS layers string.
 * @example:
 * new og.layer.WMS("USA States", { 
 *     isBaseLayer: false,
 *     url: "http://openglobus.org/geoserver/", 
 *     layers: "topp:states", 
 *     opacity: 0.5, 
 *     zIndex: 50, 
 *     attribution: 'USA states - geoserver WMS example', 
 *     transparentColor: [1.0, 1.0, 1.0], 
 *     visibility: false }
 * );
 *
 * @fires og.layer.XYZ#load
 * @fires og.layer.XYZ#loadend 
 */
og.layer.WMS = function (name, options) {
    og.inheritance.base(this, name, options);

    /**
     * WMS layers string.
     * @public
     * @type {string}
     */
    this.layers = options.layers;

    /**
     * WMS tile width.
     * @public
     * @type {number}
     */
    this.width = options.width || 256;

    /**
     * WMS tile height.
     * @public
     * @type {number}
     */
    this.height = options.height || 256;
}

og.inheritance.extend(og.layer.WMS, og.layer.XYZ);

/**
 * Start to load tile material.
 * @public
 * @virtual
 * @param {og.planetSegment.Material} mateial
 */
og.layer.WMS.prototype.handleSegmentTile = function (material) {
    if (this._planet.layersActivity) {
        material.imageReady = false;
        material.imageIsLoading = true;
        if (og.layer.XYZ.__requestsCounter >= og.layer.XYZ.MAX_REQUESTS && this.counter) {
            this.pendingsQueue.push(material);
        } else {
            this._exec(material);
        }
    };
};

/**
 * Creates query url.
 * @protected
 * @virtual
 * @param {og.planetSegment.Segment}
 */
og.layer.WMS.prototype._createUrl = function (segment) {
    return this.url + "wms?" + "LAYERS=" + this.layers +
            "&FORMAT=image/jpeg&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
            "&SRS=" + segment._projection.code +
            "&BBOX=" + segment.extent.getWest() + "," + segment.extent.getSouth() + "," + segment.extent.getEast() + "," + segment.extent.getNorth() +
            "&WIDTH=" + this.width +
            "&HEIGHT=" + this.height;
};