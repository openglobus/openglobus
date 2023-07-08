// #StandWithUkraine

/**
 * @module og/Globe
 */

"use strict";

import { CompassButton } from "./control/CompassButton.js";
import { EarthCoordinates } from "./control/EarthCoordinates.js";
import { EarthNavigation } from "./control/EarthNavigation.js";
import { MouseNavigation } from "./control/MouseNavigation.js";
import { ScaleControl } from "./control/ScaleControl.js";
import { Sun } from "./control/Sun.js";
import { TouchNavigation } from "./control/TouchNavigation.js";
import { ZoomControl } from "./control/ZoomControl.js";
import { Vec3 } from "./math/Vec3.js";
import { Renderer } from "./renderer/Renderer.js";
import { Planet } from "./scene/Planet.js";
import { EmptyTerrain } from "./terrain/EmptyTerrain.js";
import { createColorRGB, getUrlParam, isEmpty } from "./utils/shared.js";
import { Handler } from "./webgl/Handler.js";

/** @const {string} */
const PLANET_NAME_PREFIX = "globus_planet_";

/**
 * Creates a WebGL context with globe.
 * @class
 *
 * @example <caption>Basic initialization</caption>
 * globus = new og.Globe({
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
 *     'terrain': new og.terrain.GlobusTerrain(),
 *     'layers': [
 *          new og.layer.XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png", visibility: true, attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' })
 *      ],
 *     'autoActivate': true
 * });
 *
 * @param {object} options - Options:
 * @param {string} options.target - HTML element id where planet canvas have to be created.
 * @param {RenderNode} [options.skybox] - Render skybox. null - default.
 * @param {string} [options.name] - Planet name. Default is unic identifier.
 * @param {Terrain} [options.terrain] - Terrain provider. Default no terrain - og.terrain.EmptyTerrain.
 * @param {Array.<control.Control>} [options.controls] - Renderer controls array.
 * @param {Array.<Layer>} [options.layers] - Planet layers.
 * @param {Extent} [options.viewExtent] - Viewable starting extent.
 * @param {boolean} [options.autoActivate] - Globe rendering auto activation flag. True is default.
 * @param {DOMElement} [options.attributionContainer] - Container for attribution list.
 * @param {Number} [options.maxGridSize] = Maximal segment grid size. 128 is default
 * @param {boolean} [options.useSpecularTexture] - use specular water mask
 * @param {boolean} [options.useNightTexture] - show night cities
 * @param {Number} [options.maxAltitude=15000000.0] - Maximal camera altitude above terrain
 * @param {Number} [options.minAltitude=1.0] - Minimal camera altitude above terrain
 * @param {Number} [options.maxEqualZoomAltitude=15000000.0] - Maximal altitude since segments on the screen bacame the same zoom level
 * @param {Number} [options.minEqualZoomAltitude=10000.0] - Minimal altitude since segments on the screen bacame the same zoom level
 * @param {Number} [options.minEqualZoomCameraSlope=0.8] - Minimal camera slope above te globe where segments on the screen bacame the same zoom level
 * @param {Number} [options.loadingBatchSize=12] -
 * @param {Number} [options.quadTreeStrategyPrototype] - Prototype of quadTree. QuadTreeStrategy for Earth is default.
 * @param {Number} [options.msaa] - MSAA antialiasing parameter: 2,4,8,16. Default is 4.
 * @param {Number} [options.dpi] - Device pixel ratio. Default is current screen DPI.
 * @param {Boolean} [options.atmosphereEnabled] - Enables atmosphere effect.
 */

class Globe {
    /**
     * @param {*} options
     */
    constructor(options) {

        this.$target = null;

        this._instanceID = `__globus${Globe.__staticCounter++ ? Globe.__staticCounter : ""}__`;
        window[this._instanceID] = this;

        //
        // Canvas creation
        //
        this._canvas = document.createElement("canvas");
        this._canvas.id = `canvas${this._instanceID}`;
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.style.display = "block";
        this._canvas.style.opacity = "0.0";
        this._canvas.style.transition = "opacity 150ms";

        /**
         * Dom element where WebGL canvas creates
         * @public
         * @type {Element}
         */
        this.$inner = document.createElement('div');
        this.$inner.classList.add("og-inner");
        this.$inner.appendChild(this._canvas);

        this.$inner.attributions = document.createElement('div');
        if (options.attributionContainer) {
            options.attributionContainer.appendChild(this.$inner.attributions);
        } else {
            this.$inner.attributions.classList.add("og-attribution");
            this.$inner.appendChild(this.$inner.attributions);
        }

        this.attachTo(options.target);

        const _disableWheel = (e) => {
            e.preventDefault();
        }

        this._canvas.onmouseenter = function () {
            document.addEventListener("mousewheel", _disableWheel, {
                capture: false,
                passive: false
            });
        };
        this._canvas.onmouseleave = function () {
            document.removeEventListener("mousewheel", _disableWheel);
        };

        /**
         * Interface for the renderer context(events, input states, renderer nodes etc.)
         * @public
         * @type {Renderer}
         */
        this.renderer = new Renderer(
            new Handler(this._canvas, {
                autoActivate: false,
                pixelRatio: options.dpi || (window.devicePixelRatio + 0.15),
                context: {
                    alpha: false,
                    antialias: false,
                    premultipliedAlpha: false
                }
            }), {
                autoActivate: false,
                msaa: options.msaa
            }
        );

        this.renderer.div = this.$inner;

        // Skybox
        if (options.skybox) {
            this.renderer.addNode(options.skybox);
        }

        /**
         * Planet node name. Access with this.renderer.<name>
         * @private
         * @type {String}
         */
        this._planetName = options.name ? options.name : PLANET_NAME_PREFIX + Globe._staticCounter;

        /**
         * quad tree type.
         * @private
         * @type {Number}
         */
        this._quadTreeType = options.quadTreeType;

        this.planet = new Planet({
            name: this._planetName,
            frustums: options.frustums,
            ellipsoid: options.ellipsoid,
            maxGridSize: options.maxGridSize,
            useNightTexture: options.useNightTexture,
            useSpecularTexture: options.useSpecularTexture,
            minAltitude: options.minAltitude,
            maxAltitude: options.maxAltitude || 15000000,
            maxEqualZoomAltitude: options.maxEqualZoomAltitude,
            minEqualZoomAltitude: options.minEqualZoomAltitude,
            minEqualZoomCameraSlope: options.minEqualZoomCameraSlope,
            quadTreeStrategyPrototype: options.quadTreeStrategyPrototype,
            maxLoadingRequests: options.maxLoadingRequests,
            atmosphereEnabled: options.atmosphereEnabled
        });

        // Attach terrain provider (can be one object or array)
        if (options.terrain) {
            if (Array.isArray(options.terrain)) {
                this.planet.setTerrain(options.terrain[0]); // If array get the terrain from 1st element
                this.planet._terrainPool = options.terrain;
            } else {
                this.planet.setTerrain(options.terrain);
                this.planet._terrainPool = [options.terrain];
            }

        } else {
            this.planet.setTerrain(new EmptyTerrain());
        }

        this.renderer.addNode(this.planet);

        // Add controls
        if (options.controls) {
            this.planet.addControls(options.controls);
        } else {
            this.planet.addControls([
                new ZoomControl(),
                options.useEarthNavigation
                    ? new EarthNavigation()
                    : new MouseNavigation({
                        minSlope: options.minSlope
                    }),
                new TouchNavigation(),
                new EarthCoordinates(),
                new ScaleControl(),
                new CompassButton(options)
            ]);
        }

        var _controls = this.renderer.controls;
        for (var i in _controls) {
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

        // TODO: view center, altitude, extent
        let ve = options.viewExtent;
        if (ve) {
            if (ve instanceof Array) {
                this.planet.viewExtentArr(ve);
            } else {
                this.planet.viewExtent(ve);
            }
        }

        this._opacityCounter = 0;
        this._fadeHandler = null;
        this._stopHandler = null;

        // Run!
        if (options.autoActivate || isEmpty(options.autoActivate)) {
            this.start();
        }
    }

    static get __staticCounter() {
        if (!this.__counter && this.__counter !== 0) {
            this.__counter = 0;
        }
        return this.__counter;
    }

    static set __staticCounter(n) {
        this.__counter = n;
    }

    start() {
        this.renderer.start();
        this.fadeIn();
    }

    /**
     * Starts screen brightness fading in effect by the duration time.
     * @public
     */
    fadeIn() {
        this._canvas.style.opacity = 1.0;
    }

    /**
     * Starts screen brightness fading out effect by the duration time.
     * @public
     * @param {number} duration - Fadeout duration time.
     */
    fadeOut() {
        this._canvas.style.opacity = 0.0;
    }

    attachTo(target) {

        this.detach();

        let t;
        if (target instanceof HTMLElement) {
            t = target;
        } else {
            t = document.getElementById(target) || document.querySelector(target);
        }

        if (t) {
            this.$target = t;
            t.appendChild(this.$inner);
        }
    }

    detach() {
        if (this.$target) {
            // Remember that when container is zero
            // sized(display none etc.) renderer frame will be stopped
            this.$target.removeChild(this.$inner);
        }
    }

    destroy() {
        this.detach();
        this.renderer.destroy();
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
}

export { Globe };
