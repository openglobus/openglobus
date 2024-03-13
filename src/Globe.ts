// #StandWithUkraine

import {CompassButton} from "./control/CompassButton";
import {Control} from "./control/Control";
import {EarthCoordinates} from "./control/EarthCoordinates";
import {EarthNavigation} from "./control/EarthNavigation";
import {Ellipsoid} from "./ellipsoid/Ellipsoid";
import {EmptyTerrain} from "./terrain/EmptyTerrain";
import {Handler} from "./webgl/Handler";
import {isEmpty} from "./utils/shared";
import {Layer} from "./layer/Layer";
import {MouseNavigation} from "./control/MouseNavigation";
import {NumberArray2} from "./math/Vec2";
import {NumberArray4} from "./math/Vec4";
import {Planet} from "./scene/Planet";
import {ScaleControl} from "./control/ScaleControl";
import {Sun} from "./control/Sun";
import {TouchNavigation} from "./control/TouchNavigation";
import {HTMLDivElementExt, Renderer} from "./renderer/Renderer";
import {RenderNode} from "./scene/RenderNode";
import {ZoomControl} from "./control/ZoomControl";
import {Extent} from "./Extent";

interface IGlobeParams {
    attributionContainer?: HTMLElement;
    target?: string | HTMLElement;
    skybox?: RenderNode;
    dpi?: number;
    msaa?: number;
    name?: string;
    frustums?: NumberArray2[];
    ellipsoid?: Ellipsoid;
    maxGridSize?: number;
    nightTextureSrc?: string | null;
    specularTextureSrc?: string | null;
    minAltitude?: number;
    maxAltitude?: number;
    maxEqualZoomAltitude?: number;
    minEqualZoomAltitude?: number;
    minEqualZoomCameraSlope?: number;
    quadTreeStrategyPrototype?: any;
    maxLoadingRequests?: number;
    atmosphereEnabled?: boolean;
    transitionOpacityEnabled?: boolean;
    terrain?: EmptyTerrain;
    controls?: Control[];
    useEarthNavigation?: boolean;
    minSlope?: number;
    sun?: {
        active?: boolean;
        stopped?: boolean
    };
    layers?: Layer[];
    viewExtent?: Extent | NumberArray4;
    autoActivate?: boolean;

    fontsSrc?: string;
    resourcesSrc?: string;
}

const DEFAULT_NIGHT_SRC = `/night.png`;
const DEFAULT_SPEC_SRC = `/spec.png`;
const DEFAULT_RESOURCES_SRC = '/res';

/** @const {string} */
const PLANET_NAME_PREFIX = "globus_planet_";

/**
 * Creates a WebGL context with globe.
 * @class
 *
 * @example <caption>Basic initialization</caption>
 * globus = new Globe({
 *     'atmosphere': false,
 *     'target': 'globus',
 *     'name': 'Earth',
 *     'controls': [
 *          new control.MouseNavigation({ autoActivate: true }),
 *          new control.KeyboardNavigation({ autoActivate: true }),
 *          new control.EarthCoordinates({ autoActivate: true, center: false }),
 *          new control.LayerSwitcher({ autoActivate: true }),
 *          new control.ZoomControl({ autoActivate: true }),
 *          new control.TouchNavigation({ autoActivate: true }),
 *          new control.Sun({ autoActivate: true })
 *      ],
 *     'terrain': new GlobusTerrain(),
 *     'layers': [
 *          new XYZ("OpenStreetMap", { isBaseLayer: true, url: "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png", visibility: true, attribution: 'Data @ <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="http://www.openstreetmap.org/copyright">ODbL</a>' })
 *      ],
 *     'autoActivate': true
 * });
 *
 * @param {IGlobeParams} options - Options:
 * @param {string|HTMLElement} options.target - HTML element id where planet canvas have to be created.
 * @param {string} [options.name] - Planet name. Default is uniq identifier.
 * @param {EmptyTerrain} [options.terrain] - Terrain provider. Default no terrain - og.terrain.EmptyTerrain.
 * @param {Array.<Control>} [options.controls] - Renderer controls array.
 * @param {Array.<Layer>} [options.layers] - Planet layers.
 * @param {Extent| [[number, number],[number, number]]} [options.viewExtent] - Viewable starting extent.
 * @param {boolean} [options.autoActivate=true] - Globe rendering auto activation flag. True is default.
 * @param {HTMLElement} [options.attributionContainer] - Container for attribution list.
 * @param {number} [options.maxGridSize=128] = Maximal segment grid size. 128 is default
 * @param {string} [options.fontsSrc] -  Fonts collection url.
 * @param {string} [options.resourcesSrc] - Resources root src.
 * @param {string} [options.nightTextureSrc] - Night glowing image sources
 * @param {string} [options.specularTextureSrc] - Specular water mask image sourcr
 * @param {number} [options.maxAltitude=15000000.0] - Maximal camera altitude above terrain
 * @param {number} [options.minAltitude=1.0] - Minimal camera altitude above terrain
 * @param {number} [options.maxEqualZoomAltitude=15000000.0] - Maximal altitude since segments on the screen became the same zoom level
 * @param {number} [options.minEqualZoomAltitude=10000.0] - Minimal altitude since segments on the screen became the same zoom level
 * @param {number} [options.minEqualZoomCameraSlope=0.8] - Minimal camera slope above te globe where segments on the screen became the same zoom level
 * @param {number} [options.loadingBatchSize=12] -
 * @param {number} [options.quadTreeStrategyPrototype] - Prototype of quadTree. QuadTreeStrategy for Earth is default.
 * @param {number} [options.msaa=0] - MSAA antialiasing parameter: 2,4,8,16. Default is 0.
 * @param {number} [options.dpi] - Device pixel ratio. Default is current screen DPI.
 * @param {boolean} [options.atmosphereEnabled] - Enables atmosphere effect.
 * @param {boolean} [options.transtitionOpacityEnabled] - Enables terrain smooth opacity transition effect.
 */

class Globe {

    static __counter__: number = 0;

    public $target: HTMLElement | null;

    protected _instanceID: string;

    protected _canvas: HTMLCanvasElement;

    public $inner: HTMLDivElementExt;

    /**
     * Interface for the renderer context(events, input states, renderer nodes etc.)
     * @public
     * @type {Renderer}
     */
    public renderer: Renderer;

    /**
     * Planet node name. Access with this.renderer.<name>
     * @private
     * @type {String}
     */
    protected _planetName: string;

    public planet: Planet;

    public sun: Sun;

    constructor(options: IGlobeParams) {

        this.$target = null;

        this._instanceID = `__globus${Globe.__counter__++ ? Globe.__counter__ : ""}__`;
        (window as any)[this._instanceID] = this;

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

        if (options.target) {
            this.attachTo(options.target);
        }

        const _disableWheel = (e: Event) => {
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

        this.renderer = new Renderer(
            new Handler(this._canvas, {
                autoActivate: false,
                pixelRatio: options.dpi || (window.devicePixelRatio + 0.15),
                context: {
                    //alpha: false,
                    antialias: false,
                    premultipliedAlpha: false
                }
            }), {
                autoActivate: false,
                msaa: options.msaa,
                fontsSrc: options.fontsSrc
            }
        );

        this.renderer.div = this.$inner;

        // Skybox
        if (options.skybox) {
            this.renderer.addNode(options.skybox);
        }

        this._planetName = options.name ? options.name : PLANET_NAME_PREFIX + Globe.__counter__;

        this.planet = new Planet({
            name: this._planetName,
            frustums: options.frustums,
            ellipsoid: options.ellipsoid,
            maxGridSize: options.maxGridSize,
            nightTextureSrc: options.nightTextureSrc === null ? null : `${options.resourcesSrc || DEFAULT_RESOURCES_SRC}${DEFAULT_NIGHT_SRC}`,
            specularTextureSrc: options.specularTextureSrc === null ? null : `${options.resourcesSrc || DEFAULT_RESOURCES_SRC}${DEFAULT_SPEC_SRC}`,
            minAltitude: options.minAltitude,
            maxAltitude: options.maxAltitude || 15000000,
            maxEqualZoomAltitude: options.maxEqualZoomAltitude,
            minEqualZoomAltitude: options.minEqualZoomAltitude,
            minEqualZoomCameraSlope: options.minEqualZoomCameraSlope,
            quadTreeStrategyPrototype: options.quadTreeStrategyPrototype,
            maxLoadingRequests: options.maxLoadingRequests,
            atmosphereEnabled: options.atmosphereEnabled,
            transitionOpacityEnabled: options.transitionOpacityEnabled
        });

        // Attach terrain provider (can be one object or array)
        if (options.terrain) {
            //@todo: refactoring
            if (Array.isArray(options.terrain)) {
                this.planet.setTerrain(options.terrain[0]); // If array get the terrain from 1st element
            } else {
                this.planet.setTerrain(options.terrain);
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
                options.useEarthNavigation ? new EarthNavigation() : new MouseNavigation({minSlope: options.minSlope}),
                new TouchNavigation(),
                new EarthCoordinates(),
                new ScaleControl(),
                new CompassButton()
            ]);
        }

        const _controls = this.renderer.controls;
        let sun;
        for (let i in _controls) {
            if (_controls[i] instanceof Sun) {
                sun = _controls[i] as Sun;
                break;
            }
        }

        if (!sun) {
            this.sun = new Sun();
            this.planet.addControl(this.sun);
        } else {
            this.sun = sun;
        }

        if (options.sun) {
            if (options.sun.active !== undefined && !options.sun.active) {
                this.sun.deactivate();
            }
            if (options.sun.stopped === true) {
                this.sun.stop();
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
                this.planet.viewExtent(ve as Extent);
            }
        }

        // Run!
        if (options.autoActivate || isEmpty(options.autoActivate)) {
            this.start();
        }
    }

    public start() {
        this.renderer.start();
        this.fadeIn();
    }

    /**
     * Starts screen brightness fading in effect by the duration time.
     * @public
     */
    public fadeIn() {
        this._canvas.style.opacity = "1.0";
    }

    /**
     * Starts screen brightness fading out effect by the duration time.
     * @public
     */
    public fadeOut() {
        this._canvas.style.opacity = "0";
    }

    public attachTo(target: HTMLElement | string) {

        this.detach();

        let t;
        if (target instanceof HTMLElement) {
            t = target;
        } else {
            t = document.getElementById(target) || document.querySelector(target);
        }

        if (t) {
            this.$target = t as HTMLElement;
            t.appendChild(this.$inner);
        }
    }

    public detach() {
        if (this.$target) {
            // Remember that when container is zero
            // sized(display none etc.) renderer frame will be stopped
            this.$target.removeChild(this.$inner);
        }
    }

    public destroy() {
        this.detach();
        this.renderer.destroy();
    }
}

export {Globe};
