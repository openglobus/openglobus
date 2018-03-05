/**
 * @module og/Globe
 */

import { EmptyTerrainProvider } from './terrainProvider/EmptyTerrainProvider';
import { Handler } from './webgl/Handler.js';
import { Planet } from './scene/Planet.js';
import { Renderer } from './renderer/Renderer.js';
import { wgs84 } from './ellipsoid/wgs84.js';

import { EarthCoordinates } from './control/EarthCoordinates.js';
import { MouseNavigation } from './control/MouseNavigation.js';
import { TouchNavigation } from './control/TouchNavigation.js';
import { Sun } from './control/sun.js';
import { ZoomControl } from './control/ZoomControl.js';

/** @const {string} */
const CANVAS_ID_PREFIX = "globus_viewport_";
/** @const {string} */
const PLANET_NAME_PREFIX = "globus_planet_";

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
class Globus {
    constructor(options) {

        //Canvas creation.
        var _canvasId = CANVAS_ID_PREFIX + Globus._staticCounter++;

        this._canvas = document.createElement("canvas");
        this._canvas.id = _canvasId;
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.style.display = "block";
        this._canvas.style.opacity = "1.0";

        /**
         * Dom element where WebGL canvas creates
         * @public
         * @type {Element}
         */
        this.div = document.getElementById(options.target);
        this.div.appendChild(this._canvas);
        this.div.classList.add("ogViewport");
        function _disableWheel() { return false; }
        function _enableWheel() { return true; }
        this.div.onmouseenter = function () { document.onmousewheel = _disableWheel; };
        this.div.onmouseleave = function () { document.onmousewheel = _enableWheel; };

        //WegGL handler creation
        var _handler = new Handler(_canvasId, { 'alpha': false, 'antialias': false });
        _handler.initialize();

        /**
         * Interface for the renderer context(events, input states, renderer nodes etc.)
         * @public
         * @type {og.Renderer}
         */
        this.renderer = new Renderer(_handler);
        this.renderer.initialize();
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
        this._planetName = options.name ? options.name : PLANET_NAME_PREFIX + Globus._staticCounter;

        if (options.atmosphere) {
            /**
             * Render node renders a planet.
             * @public
             * @type {og.scene.Planet|og.scene.PlanetAtmosphere}
             */

            //TODO:

        } else {
            this.planet = new Planet(this._planetName, options.ellipsoid ? options.ellipsoid : wgs84);
        }

        //Attach terrain provider
        if (options.terrain) {
            this.planet.setTerrainProvider(options.terrain);
        } else {
            this.planet.setTerrainProvider(new EmptyTerrainProvider());
        }

        this.renderer.addRenderNode(this.planet);

        this.sun;

        //Add controls
        if (options.controls) {
            this.planet.addControls(options.controls);
        } else {
            this.planet.addControls([
                new MouseNavigation(),
                new TouchNavigation(),
                new ZoomControl(),
                new EarthCoordinates()
            ]);
        }

        var _controls = this.renderer.controls;
        for (var i = 0; i < _controls.length; i++) {
            if (_controls[i] instanceof Sun) {
                this.sun = _controls[i];
                break;
            }
        }

        if (!this.sun) {
            this.sun = new Sun();
            this.planet.addControl(this.sun);
        }

        if (options.sun) {
            if (options.sun.active !== undefined && !options.sun.active) {
                this.sun.deactivate();
            }
        }

        if (options.layers) {
            this.planet.addLayers(options.layers);
        }

        //TODO: view center, altitude, extent
        if (options.viewExtent) {
            this.planet.viewToExtent(options.viewExtent);
        }

        this._opacityCounter = 0;
        this._fadeHandler = null;
        this._stopHandler = null;

        //Run!
        if (isUndefined(options.autoActivate) || options.autoActivate) {
            this.fadeIn(500);
            this.renderer.start();
        }
    }

    /**
     * Starts screen brightness fading in effect by the duration time.
     * @public
     * @param {number} duration - fadein duration time.
     */
    fadeIn(duration) {
        clearInterval(this._stopHandler);
        clearInterval(this._fadeHandler);
        this._canvas.style.opacity = 0.0;
        this._opacityCounter = 0.0;
        var delta = 10.0;
        var d = 1.0 / (duration / delta);

        this._fadeHandler = setInterval(() => {
            this._opacityCounter += d;
            if (this._opacityCounter >= 1) {
                this._opacityCounter = 1.0;
                clearInterval(this._fadeHandler);
            }
            this._canvas.style.opacity = this._opacityCounter;
        }, delta);
    }

    /**
     * Starts screen brightness fading out effect by the duration time.
     * @public
     * @param {number} duration - Fadeout duration time.
     */
    fadeOut(duration) {
        clearInterval(this._stopHandler);
        clearInterval(this._fadeHandler);
        this._canvas.style.opacity = 1.0;
        this._opacityCounter = 1.0;
        var delta = 10.0;
        var d = 1 / (duration / delta);

        this._fadeHandler = setInterval(() => {
            this._opacityCounter -= d;
            if (this._opacityCounter <= 0.0) {
                this._opacityCounter = 0.0;
                clearInterval(this._fadeHandler);
            }
            this._canvas.style.opacity = this._opacityCounter;
        }, delta);
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    /**
     * Returns true if the object pointer is undefined.
     * @function
     * @param {Object} obj - Object pointer.
     * @returns {boolean} Returns true if object is undefined.
     */
    static isUndefined(obj) {
        return obj === void 0;
    }
};

export { Globe };