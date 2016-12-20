goog.provide('og.Globus');

goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.scene.Planet');
goog.require('og.scene.PlanetAtmosphere');
goog.require('og.ellipsoid.wgs84');
goog.require('og.terrainProvider.EmptyTerrainProvider');

/**
 * Creates a WebGL context with globe.
 * @class
 *
 * @example <caption>Basic initialization</caption>
 * globus = new og.Globus({
 *     'atmosphere': false,
 *     'target': 'globus',
 *     'name': 'Earth',
 *     'controls': [
 *          new og.control.MouseNavigation({ autoActivate: true }),
 *          new og.control.KeyboardNavigation({ autoActivate: true }),
 *          new og.control.EarthCoordinates({ autoActivate: true, center: false }),
 *          new og.control.LayerSwitcher({ autoActivate: true }),
 *          new og.control.ZoomControl({ autoActivate: true }),
 *          new og.control.TouchNavigation({ autoActivate: true }),
 *          new og.control.Sun({ autoActivate: true })
 *      ],
 *     'skybox': skybox,
 *     'terrain': terrain,
 *     'layers': [
 *          new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png", visibility: true, attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' })
 *      ],
 *     'autoActivated': true
 * });
 *
 * @param {object} options - Options:
 * @param {string} options.target - HTML element id where planet canvas have to be created.
 * @param {boolean} [options.skybox] - Render skybox. null - default.
 * @param {boolean} [options.atmosphere] - Render planet with atmosphere. False - default.
 * @param {string} [options.name] - Planet name. Default is unic identifier.
 * @param {og.terrainProvider.TerrainProvider} [options.terrain] - Terrain provider. Default no terrain - og.terrainProvider.EmptyTerrainProvider.
 * @param {Array.<og.control.BaseControl>} [options.controls] - Renderer controls array.
 * @param {Array.<og.layer.Layer>} [options.layers] - Planet layers.
 * @param {og.Extent} [options.viewExtent] - Viewable starting extent.
 * @param {boolean} [options.autoActivate] - Globus rendering auto activation flag. True is default.
 */
og.Globus = function (options) {

    //Canvas creation.
    var _canvasId = og.Globus.CANVAS_ID_PREFIX + og.Globus.__id;
    var _canvas = document.createElement("canvas");
    _canvas.id = _canvasId;
    _canvas.style.width = "100%";
    _canvas.style.height = "100%";
    _canvas.style.display = "block";
    _canvas.style.opacity = "1.0";

    /**
     * Dom element where WebGL canvas creates
     * @public
     * @type {Element}
     */
    this.div = document.getElementById(options.target);
    this.div.appendChild(_canvas);
    this.div.classList.add("ogViewport");
    function _disableWheel() { return false; };
    function _enableWheel() { return true; };
    this.div.onmouseenter = function () { document.onmousewheel = _disableWheel };
    this.div.onmouseleave = function () { document.onmousewheel = _enableWheel };

    //WegGL handler creation
    var _handler = new og.webgl.Handler(_canvasId, { 'alpha': false, 'antialias': false });
    _handler.initialize();

    /**
     * Interface for the renderer context(events, input states, renderer nodes etc.)
     * @public
     * @type {og.Renderer}
     */
    this.renderer = new og.Renderer(_handler);
    this.renderer.init();
    this.renderer.div = this.div;
    this.renderer.div.attributions = document.createElement("div");
    this.renderer.div.attributions.classList.add("ogAttribution");
    this.div.appendChild(this.renderer.div.attributions);

    //Skybox
    if (options.skybox) {
        this.renderer.addRenderNode(options.skybox);
    }

    /**
     * Planet node name. Access with this.renderer.<name>
     * @private
     * @type {String}
     */
    this._planetName = options.name ? options.name : og.Globus.PLANET_NAME_PREFIX + og.Globus.__id;

    if (options.atmosphere) {
        /**
         * Render node renders a planet.
         * @public
         * @type {og.scene.Planet|og.scene.PlanetAtmosphere}
         */
        this.planet = new og.scene.PlanetAtmosphere(this._planetName, options.ellipsoid ? options.ellipsoid : og.ellipsoid.wgs84);
    } else {
        this.planet = new og.scene.Planet(this._planetName, options.ellipsoid ? options.ellipsoid : og.ellipsoid.wgs84);
    }

    //Attach terrain provider
    if (options.terrain) {
        this.planet.setTerrainProvider(options.terrain);
    } else {
        this.planet.setTerrainProvider(new og.terrainProvider.EmptyTerrainProvider());
    }

    this.renderer.addRenderNode(this.planet);

    //Add controls
    if (options.controls) {
        this.renderer.addControls(options.controls)
    }

    if (options.layers) {
        this.planet.addLayers(options.layers);
    }

    og.Globus.__id++;

    //TODO: view center, altitude, extent
    if (options.viewExtent) {
        this.planet.viewToExtent(options.viewExtent);
    }

    var opacityCounter = 0;
    var fadeHandler = null;
    var stopHandler = null;

    /**
     * Starts screen brightness fading in effect by the duration time.
     * @public
     * @param {number} - fadein duration time.
     */
    this.fadeIn = function (duration) {
        clearInterval(stopHandler);
        clearInterval(fadeHandler);
        _canvas.style.opacity = 0.0;
        opacityCounter = 0.0;
        var delta = 10.0;
        var d = 1.0 / (duration / delta);

        fadeHandler = setInterval(function () {
            opacityCounter += d;
            if (opacityCounter >= 1) {
                opacityCounter = 1.0;
                clearInterval(fadeHandler);
            }
            _canvas.style.opacity = opacityCounter;
        }, delta);
    };

    /**
     * Starts screen brightness fading out effect by the duration time.
     * @public
     * @param {number} - Fadeout duration time.
     */
    this.fadeOut = function (duration) {
        clearInterval(stopHandler);
        clearInterval(fadeHandler);
        _canvas.style.opacity = 1.0;
        opacityCounter = 1.0;
        var delta = 10.0;
        var d = 1 / (duration / delta);

        fadeHandler = setInterval(function () {
            opacityCounter -= d;
            if (opacityCounter <= 0.0) {
                opacityCounter = 0.0;
                clearInterval(fadeHandler);
            }
            _canvas.style.opacity = opacityCounter;
        }, delta);

    };

    //Run!
    if (isUndefined(options.autoActivate) || options.autoActivate) {
        this.fadeIn(500);
        this.renderer.start();
    }
};

og.Globus.__id = 1;

/** @const {string} */
og.Globus.CANVAS_ID_PREFIX = "globus_viewport_";
/** @const {string} */
og.Globus.PLANET_NAME_PREFIX = "globus_planet_";

/**
 * Returns true if the object pointer is undefined.
 * @function
 * @param {Object} obj - Object pointer.
 * @returns {boolean}
 */
function isUndefined(obj) {
    return obj === void 0;
};