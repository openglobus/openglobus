goog.provide('og.layer');
goog.provide('og.layer.Layer');

goog.require('og.Events');
goog.require('og.QueueArray');

/**
 * @const
 */
og.layer.MAXIMUM_OVERLAYS = 8;

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not instantiated in apps.
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
    this.transparentColor = options.transparentColor || [-1.0, -1.0, -1.0];

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
     * @type {og.node.Planet}
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
 * @param {og.node.Planet} planet- Planet render node.
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
 * @param {og.node.Planet}
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