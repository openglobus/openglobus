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
 * A visual representation of raster or vector map data well known as a layer.
 * @class
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} [options] - Layer options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {Array.<number,number,number>} [options.transparentColor=[-1,-1,-1]] - RGB color that defines transparent color.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - This is a base layer.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {og.Extent} [options.extent=new og.Extent(-180.0, -90.0, 180.0, 90.0)] - Visible extent.
 * @param {Object} [options.lightMaterial] - Material lighting parameters:
 * @param {og.math.Vector3} [options.lightMaterial.ambient=[0.1, 0.1, 0.21]] - Ambient RGB color.
 * @param {og.math.Vector3} [options.lightMaterial.diffuse=[1.0, 1.0, 1.0]] - Diffuse RGB color.
 * @param {og.math.Vector3} [options.lightMaterial.specular=[0.00025, 0.00015, 0.0001]] - Specular RGB color.
 * @param {Number} [options.lightMaterial.shininess=100] - Shininess.
 *
 * @fires og.layer.Layer#visibilitychange
 * @fires og.layer.Layer#add
 * @fires og.layer.Layer#remove
 * @fires og.layer.Vector#mousemove
 * @fires og.layer.Vector#mouseenter
 * @fires og.layer.Vector#mouseleave
 * @fires og.layer.Vector#mouselbuttonclick
 * @fires og.layer.Vector#mouserbuttonclick
 * @fires og.layer.Vector#mousembuttonclick
 * @fires og.layer.Vector#mouselbuttondoubleclick
 * @fires og.layer.Vector#mouserbuttondoubleclick
 * @fires og.layer.Vector#mousembuttondoubleclick
 * @fires og.layer.Vector#mouselbuttonup
 * @fires og.layer.Vector#mouserbuttonup
 * @fires og.layer.Vector#mousembuttonup
 * @fires og.layer.Vector#mouselbuttondown
 * @fires og.layer.Vector#mouserbuttondown
 * @fires og.layer.Vector#mousembuttondown
 * @fires og.layer.Vector#mouselbuttonhold
 * @fires og.layer.Vector#mouserbuttonhold
 * @fires og.layer.Vector#mousembuttonhold
 * @fires og.layer.Vector#mousewheel
 * @fires og.layer.Vector#touchmove
 * @fires og.layer.Vector#touchstart
 * @fires og.layer.Vector#touchend
 * @fires og.layer.Vector#doubletouch
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
    this.transparentColor = options.transparentColor || [-1, -1, -1];

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

    options.lightMaterial = options.lightMaterial || {};

    /**
     * Layer light material parameters.
     * @public
     * @type {Object}
     */
    this.lightMaterial = {
        'ambient': options.lightMaterial.ambient || new og.math.Vector3(0.1, 0.1, 0.21),
        'diffuse': options.lightMaterial.diffuse || new og.math.Vector3(1.0, 1.0, 1.0),
        'specular': options.lightMaterial.specular || new og.math.Vector3(0.00025, 0.00015, 0.0001),
        'shininess': 100
    };

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
     * Visible degrees extent.
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
        this.setExtent(new og.Extent(new og.LonLat(-180.0, -90), new og.LonLat(180.0, 90.0)));
    }

    /**
     * Layer picking color. Assign when added to the planet.
     * @protected
     * @type {og.math.Vector3}
     */
    this._pickingColor = new og.math.Vector3();

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
    "remove",

    /**
     * Triggered when mouse moves over the layer.
     * @event og.layer.Layer#mousemove
     */
    "mousemove",

    /**
     * Triggered when mouse has entered over the layer.
     * @event og.layer.Layer#mouseenter
     */
    "mouseenter",

    /**
     * Triggered when mouse leaves the layer.
     * @event og.layer.Layer#mouseenter
     */
    "mouseleave",

    /**
     * Mouse left button clicked.
     * @event og.layer.Layer#mouselbuttonclick
     */
    "mouselbuttonclick",

    /**
     * Mouse right button clicked.
     * @event og.layer.Layer#mouserbuttonclick
     */
    "mouserbuttonclick",

    /**
     * Mouse right button clicked.
     * @event og.layer.Layer#mousembuttonclick
     */
    "mousembuttonclick",

    /**
     * Mouse left button double click.
     * @event og.layer.Layer#mouselbuttondoubleclick
     */
    "mouselbuttondoubleclick",

    /**
     * Mouse right button double click.
     * @event og.layer.Layer#mouserbuttondoubleclick
     */
    "mouserbuttondoubleclick",

    /**
     * Mouse middle button double click.
     * @event og.layer.Layer#mousembuttondoubleclick
     */
    "mousembuttondoubleclick",

    /**
     * Mouse left button up(stop pressing).
     * @event og.layer.Layer#mouselbuttonup
     */
    "mouselbuttonup",

    /**
     * Mouse right button up(stop pressing).
     * @event og.layer.Layer#mouserbuttonup
     */
    "mouserbuttonup",

    /**
     * Mouse middle button up(stop pressing).
     * @event og.layer.Layer#mousembuttonup
     */
    "mousembuttonup",

    /**
     * Mouse left button is just pressed down(start pressing).
     * @event og.layer.Layer#mouselbuttondown
     */
    "mouselbuttondown",

    /**
     * Mouse right button is just pressed down(start pressing).
     * @event og.layer.Layer#mouserbuttondown
     */
    "mouserbuttondown",

    /**
     * Mouse middle button is just pressed down(start pressing).
     * @event og.layer.Layer#mousembuttondown
     */
    "mousembuttondown",

    /**
     * Mouse left button is pressing.
     * @event og.layer.Layer#mouselbuttonhold
     */
    "mouselbuttonhold",

    /**
     * Mouse right button is pressing.
     * @event og.layer.Layer#mouserbuttonhold
     */
    "mouserbuttonhold",

    /**
     * Mouse middle button is pressing.
     * @event og.layer.Layer#mousembuttonhold
     */
    "mousembuttonhold",

    /**
     * Mouse wheel is rotated.
     * @event og.layer.Layer#mousewheel
     */
    "mousewheel",

    /**
     * Triggered when touching moves over the layer.
     * @event og.layer.Layer#touchmove
     */
    "touchmove",

    /**
     * Triggered when layer begins to touch.
     * @event og.layer.Layer#touchstart
     */
    "touchstart",

    /**
     * Triggered when layer has finished touching.
     * @event og.layer.Layer#touchend
     */
    "touchend",

    /**
     * Triggered layer has double touched.
     * @event og.layer.Layer#doubletouch
     */
    "doubletouch",

    /**
     * Triggered when touching leaves layer borders.
     * @event og.layer.Layer#touchleave
     */
    "touchleave",

    /**
     * Triggered when touch enters over the layer.
     * @event og.layer.Layer#touchenter
     */
    "touchenter"
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
 * @virtual
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
    planet.renderer.assignPickingColor(this);
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
    var p = this._planet;
    if (p) {
        var lid = this._id;
        for (var i = 0; i < p.layers.length; i++) {
            if (p.layers[i]._id == lid) {
                p.renderer.clearPickingColor(this);
                p.layers.splice(i, 1);
                p.updateVisibleLayers();
                this.clear();
                p.events.dispatch(p.events.layerremove, this);
                this.events.dispatch(this.events.remove, p);
                this._planet = null;
                return this;
            }
        }
    }
};

/**
 * Clears layer material.
 * @virtual
 */
og.layer.Layer.prototype.clear = function () {
    this._planet && this._planet._clearLayerMaterial(this);
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
 * @virtual
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

/**
 * Sets visible geographical extent.
 * @public
 * @param {og.Extent} extent - Layer visible geographical extent.
 */
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
    this._correctFullExtent();
};

/**
 * Gets layer extent.
 * @public
 * @return {og.Extent}
 */
og.layer.Layer.prototype.getExtent = function () {
    return this._extent;
};

/**
 * Special correction of the whole globe extent.
 * @protected
 */
og.layer.Layer.prototype._correctFullExtent = function () {
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
};