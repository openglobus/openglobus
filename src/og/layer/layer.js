goog.provide('og.layer');
goog.provide('og.layer.Layer');

goog.require('og.Events');
goog.require('og.QueueArray');
goog.require('og.mercator');
goog.require('og.Extent');

/**
 * @const
 */
og.layer.MAXIMUM_OVERLAYS = 8;

/**
 * @classdesc
 * Base class; normally only used for creating subclasses and not instantiated in apps.
 * A visual representation of raster or vector map data.
 * @class
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {og.Extent} [options.extent=new og.Extent(-180.0, -90.0, 180.0, 90.0)] - Visible extent.
 *
 * @fires og.layer.Layer#visibilitychange
 * @fires og.layer.Layer#add
 * @fires og.layer.Layer#remove
 */
og.layer.Layer = function (name, options) {

    options = options || {};

    /**
     * Layer user name.
     * @public
     * @type {string}
     */
    this.name = name || "noname";

    /**
     * Layer global opacity.
     * @public
     * @type {number}
     */
    this.opacity = options.opacity || 1.0;

    /**
     * Transparent RGB color mask.
     * @public
     * @type {Array.<number,number,number>}
     */
    this.transparentColor = options.transparentColor || [1.0, 17.0/255.0, 22.0/255.0];

    /**
     * Minimal zoom level when layer is visibile.
     * @public
     * @type {number}
     */
    this.minZoom = options.minZoom || 0;

    /**
     * Maximal zoom level when layer is visibile.
     * @public
     * @type {number}
     */
    this.maxZoom = options.maxZoom || 50;

    /**
     * Planet node.
     * @protected
     * @type {og.scene.Planet}
     */
    this._planet = null;

    /**
     * Unic identifier.
     * @protected
     * @type {number}
     */
    this._id = og.layer.__layersCounter++;

    /**
     * Layer attribution.
     * @protected
     * @type {string}
     */
    this._attribution = options.attribution || "";

    /**
     * Layer z-index.
     * @protected
     * @type {number}
     */
    this._zIndex = options.zIndex || 0;

    /**
     * Base layer type flag.
     * @protected
     * @type {boolean}
     */
    this._isBaseLayer = options.isBaseLayer || false;

    /**
     * Layer visibility.
     * @protected
     * @type {boolean}
     */
    this._visibility = options.visibility != undefined ? options.visibility : true;

    /**
     * Height over the ground.
     * @protected
     * @type {number}
     */
    this._height = options.height || 0;

    /**
     * Visible extent in degrees.
     * @protected
     * @type {og.Extent}
     */
    this._extent = null;

    /**
     * Visible mercator extent.
     * @protected
     * @type {og.Extent}
     */
    this._extentMerc = null;

    //Setting the extent up
    if (options.extent) {
        this.setExtent(options.extent);
    } else {
        this._extent = new og.Extent(new og.LonLat(-180.0, -90), new og.LonLat(180.0, 90.0));
        this._extentMerc = new og.Extent(new og.LonLat(-og.mercator.POLE, -og.mercator.POLE), new og.LonLat(og.mercator.POLE, og.mercator.POLE));
    }

    /**
     * Events handler.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
    this.events.registerNames(og.layer.Layer.EVENT_NAMES);
};

og.layer.Layer.EVENT_NAMES = [
    /**
     * Triggered when layer visibilty chanched.
     * @event og.layer.Layer#visibilitychange
     */
    "visibilitychange",

    /**
     * Triggered when layer has added to the planet.
     * @event og.layer.Layer#add
     */
    "add",

    /**
     * Triggered when layer has removed from the planet.
     * @event og.layer.Layer#remove
     */
    "remove"
];

og.layer.__layersCounter = 0;

/**
 * Gets layer identifier.
 * @public
 * @returns {string}
 */
og.layer.Layer.prototype.getID = function () {
    return this._id;
};

/**
 * Compares layers instances.
 * @public
 * @param {og.layer.Layer} layer
 * @returns {boolean} - Returns true if the layers is the same instance of the input.
 */
og.layer.Layer.prototype.isEqual = function (layer) {
    return layer._id == this._id;
};

/**
 * Assign the planet.
 * @protected
 * @param {og.scene.Planet} planet- Planet render node.
 */
og.layer.Layer.prototype._assignPlanet = function (planet) {
    planet.layers.push(this);
    this._planet = planet;
    this.events.on("visibilitychange", planet, planet._onLayerVisibilityChanged);
    if (this._isBaseLayer && this._visibility) {
        planet.setBaseLayer(this);
    }
    planet.events.dispatch(planet.events.layeradd, this);
    this.events.dispatch(this.events.add, planet);
    planet.updateVisibleLayers();
};

/**
 * Adds layer to the planet.
 * @public
 * @param {og.scene.Planet}
 */
og.layer.Layer.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
};

/**
 * Removes from planet.
 * @public
 */
og.layer.Layer.prototype.remove = function () {
    this._planet && this._planet.removeLayer(this);
};

/**
 * Sets layer attribution text.
 * @public
 * @param {string} html - HTML code that represents layer attribution, it could be just a text.
 */
og.layer.Layer.prototype.setAttribution = function (html) {
    this._attribution = html;
    this._planet.updateAttributionsList();
};

/**
 * Sets height over the ground.
 * @public
 * @param {number} height - Layer height.
 */
og.layer.Layer.prototype.setHeight = function (height) {
    this._height = height;
    this._planet.updateVisibleLayers();
};

/**
 * Gets layer height.
 * @public
 * @returns {number}
 */
og.layer.Layer.prototype.getHeight = function () {
    return this._height;
};

/**
 * Sets z-index.
 * @public
 * @param {number} zIndex - Layer z-index.
 */
og.layer.Layer.prototype.setZIndex = function (zIndex) {
    this._zIndex = zIndex;
    this._planet.updateVisibleLayers();
};

/**
 * Gets z-index.
 * @public
 * @returns {number}
 */
og.layer.Layer.prototype.getZIndex = function () {
    return this._zIndex;
};

/**
 * Returns true if the layer is a base.
 * @public
 * @returns {boolean}
 */
og.layer.Layer.prototype.isBaseLayer = function () {
    return this._isBaseLayer;
};

/**
 * Sets base layer type true.
 * @public
 * @param {boolean} flag - Base layer flag.
 */
og.layer.Layer.prototype.setBaseLayer = function (flag) {
    this._isBaseLayer = flag;

    if (this._planet && !flag && this.isEqual(this._planet.baseLayer)) {
        this._planet.baseLayer = null;
    }

    this._planet.updateVisibleLayers();
};

/**
 * Sets layer visibility.
 * @public
 * @param {boolean} visibility - Layer visibility.
 */
og.layer.Layer.prototype.setVisibility = function (visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);
    }
};

/**
 * Gets layer visibility.
 * @public
 * @returns {boolean}
 */
og.layer.Layer.prototype.getVisibility = function () {
    return this._visibility;
};

og.layer.Layer.prototype.setExtent = function (extent) {
    var sw = extent.southWest.clone(),
        ne = extent.northEast.clone();
    if (sw.lat < og.mercator.MIN_LAT) {
        sw.lat = og.mercator.MIN_LAT;
    }
    if (ne.lat > og.mercator.MAX_LAT) {
        ne.lat = og.mercator.MAX_LAT;
    }
    this._extent = extent.clone();
    this._extentMerc = new og.Extent(sw.forwardMercator(), ne.forwardMercator());
};

og.layer.Layer.prototype.getExtent = function () {
    return this._extent;
};