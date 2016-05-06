goog.provide('og.Globus');

goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.node.Planet');
goog.require('og.ellipsoid.wgs84');
goog.require('og.terrainProvider.EmptyTerrainProvider');

/**
 * Creates a WebGL context with globe.
 * @class
 *
 * Example:
 * 
 * var globe = new og.Globus({
 *   viewExtent: new og.Extent(new og.LonLat(-180,-90), new og.LonLat(180,90)),
 *   ellipsoid: og.ellipsoid.wgs84,
 *   layers: [
 *     new og.layers.XYZ()
 *   ],
 *   terrains: [
 *     new og.terrain
 *   ],
 *   controls: [
 *     new og.controls.LayerSwitcher({autoActivated:true})
 *   ],
 *   name: "Earth",
 *   target: 'globus'
 *
 * @param {object} options - Options.
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
    var _handler = new og.webgl.Handler(_canvasId, { alpha: false });
    _handler.init();

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

    /**
     * Render node renders a planet
     * @public
     * @type {og.node.RenderNode}
     */
    this.planet = new og.node.Planet(this._planetName, options.ellipsoid ? options.ellipsoid : og.ellipsoid.wgs84);

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
     * Starts light fading in effect with duration time
     * @public
     * @param {number} - fadein duration time
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
     * Starts light fading out effect with duration time
     * @public
     * @param {number} - fadeout duration time
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
    if (isUndefined(options.autoActivate) || options.autoActivate)
        this.renderer.start();
};

/** @const {number} */
og.Globus.__id = 1;
/** @const {string} */
og.Globus.CANVAS_ID_PREFIX = "globus_viewport_";
/** @const {string} */
og.Globus.PLANET_NAME_PREFIX = "globus_planet_";

function isUndefined(obj) {
    return obj === void 0;
};