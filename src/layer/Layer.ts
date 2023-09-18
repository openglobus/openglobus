import * as mercator from "../mercator";
import * as utils from "../utils/shared";
import {createColorRGB} from "../utils/shared";
import {createEvents, Events, EventsHandler} from "../Events";
import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Node} from "../quadTree/Node";
import {Material} from "./Material";
import {Planet} from "../scene/Planet";
import {Segment} from "../segment/Segment";
import {Vec3, NumberArray3} from "../math/Vec3";
import {NumberArray4} from "../math/Vec4";
import {IDefaultTextureParams, WebGLTextureExt} from "../webgl/Handler";

const FADING_RATIO = 15.8;

export interface ILayerParams {
    properties?: any;
    labelMaxLetters?: number;
    displayInLayerSwitcher?: boolean;
    opacity?: number;
    minZoom?: number;
    maxZoom?: number;
    attribution?: string;
    zIndex?: number;
    isBaseLayer?: boolean;
    defaultTextures?: [IDefaultTextureParams, IDefaultTextureParams];
    visibility?: boolean;
    fading?: boolean;
    height?: number;
    textureFilter?: string;
    isSRGB?: boolean;
    pickingEnabled?: boolean;
    preLoadZoomLevels?: number[];
    extent?: Extent | [[number, number], [number, number]];
    ambient?: string | NumberArray3 | Vec3;
    diffuse?: string | NumberArray3 | Vec3;
    specular?: string | NumberArray3 | Vec3;
    shininess?: number;
    nightTextureCoefficient?: number;
}

/**
 * @class
 * Base class; normally only used for creating subclasses and not instantiated in apps.
 * A visual representation of raster or vector map data well known as a layer.
 * @class
 * @param {String} [name="noname"] - Layer name.
 * @param {Object} [options] - Layer options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - This is a base layer.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {boolean} [options.displayInLayerSwitcher=true] - Presence of layer in dialog window of LayerSwitcher control.
 * @param {boolean} [options.isSRGB=false] - Layer image webgl internal format.
 * @param {Extent} [options.extent=[[-180.0, -90.0], [180.0, 90.0]]] - Visible extent.
 * @param {string} [options.textureFilter="anisotropic"] - Image texture filter. Available values: "nearest", "linear", "mipmap" and "anisotropic".
 *
 * @fires EventsHandler<LayerEventsList>#visibilitychange
 * @fires EventsHandler<LayerEventsList>#add
 * @fires EventsHandler<LayerEventsList>#remove
 * @fires EventsHandler<LayerEventsList>#mousemove
 * @fires EventsHandler<LayerEventsList>#mouseenter
 * @fires EventsHandler<LayerEventsList>#mouseleave
 * @fires EventsHandler<LayerEventsList>#lclick
 * @fires EventsHandler<LayerEventsList>#rclick
 * @fires EventsHandler<LayerEventsList>#mclick
 * @fires EventsHandler<LayerEventsList>#ldblclick
 * @fires EventsHandler<LayerEventsList>#rdblclick
 * @fires EventsHandler<LayerEventsList>#mdblclick
 * @fires EventsHandler<LayerEventsList>#lup
 * @fires EventsHandler<LayerEventsList>#rup
 * @fires EventsHandler<LayerEventsList>#mup
 * @fires EventsHandler<LayerEventsList>#ldown
 * @fires EventsHandler<LayerEventsList>#rdown
 * @fires EventsHandler<LayerEventsList>#mdown
 * @fires EventsHandler<LayerEventsList>#lhold
 * @fires EventsHandler<LayerEventsList>#rhold
 * @fires EventsHandler<LayerEventsList>#mhold
 * @fires EventsHandler<LayerEventsList>#mousewheel
 * @fires EventsHandler<LayerEventsList>#touchmove
 * @fires EventsHandler<LayerEventsList>#touchstart
 * @fires EventsHandler<LayerEventsList>#touchend
 * @fires EventsHandler<LayerEventsList>#doubletouch
 */
class Layer {

    static __counter__: number = 0;

    /**
     * Uniq identifier.
     * @public
     * @type {number}
     */
    public __id: number;

    /**
     * Events handler.
     * @public
     * @type {Events}
     */
    public events: EventsHandler<LayerEventsList>;

    /**
     * Layer user name.
     * @public
     * @type {string}
     */
    public name: string;

    public properties: any;

    public displayInLayerSwitcher: boolean;

    /**
     * Minimal zoom level when layer is visible.
     * @public
     * @type {number}
     */
    public minZoom: number;

    /**
     * Maximal zoom level when layer is visible.
     * @public
     * @type {number}
     */
    public maxZoom: number;

    /**
     * Planet node.
     * @public
     * @type {Planet}
     */
    public _planet: Planet | null;

    public createTexture: Function | null;

    public nightTextureCoefficient: number;

    protected _hasImageryTiles: boolean;

    /**
     * Layer global opacity.
     * @public
     * @type {number}
     */
    protected _opacity: number;

    /**
     * Layer attribution.
     * @protected
     * @type {string}
     */
    protected _attribution: string;

    /**
     * Layer z-index.
     * @protected
     * @type {number}
     */
    protected _zIndex: number;

    /**
     * Base layer type flag.
     * @protected
     * @type {boolean}
     */
    protected _isBaseLayer: boolean;

    public _defaultTextures: [IDefaultTextureParams | null, IDefaultTextureParams | null];

    /**
     * Layer visibility.
     * @protected
     * @type {boolean}
     */
    protected _visibility: boolean;

    public _fading: boolean;

    protected _fadingFactor: number;

    public _fadingOpacity: number;

    /**
     * Height over the ground.
     * @public
     * @type {number}
     */
    public _height: number;

    protected _textureFilter: string;

    protected _isSRGB: boolean;

    public _internalFormat: number | null;

    /**
     * Visible degrees extent.
     * @public
     * @type {Extent}
     */
    public _extent: Extent;

    /**
     * Visible mercator extent.
     * @public
     * @type {Extent}
     */
    public _extentMerc: Extent;

    /**
     * Layer picking color. Assign when added to the planet.
     * @public
     * @type {Vec3}
     */
    public _pickingColor: Vec3;

    public _pickingEnabled: boolean;

    protected _isPreloadDone: boolean;

    protected _preLoadZoomLevels: number[];

    public _ambient: Float32Array | null;
    public _diffuse: Float32Array | null;
    public _specular: Float32Array | null;

    public isVector: boolean = false;

    constructor(name?: string | null, options: ILayerParams = {}) {

        this.__id = Layer.__counter__++;

        this.events = createEvents<LayerEventsList>(LAYER_EVENTS, this);

        this.name = name || "noname";

        this.properties = options.properties || {};

        this.displayInLayerSwitcher =
            options.displayInLayerSwitcher !== undefined ? options.displayInLayerSwitcher : true;

        this._hasImageryTiles = true;

        this._opacity = options.opacity || 1.0;

        this.minZoom = options.minZoom || 0;

        this.maxZoom = options.maxZoom || 50;

        this._planet = null;

        this.isVector = false;

        this._attribution = options.attribution || "";

        this._zIndex = options.zIndex || 0;

        this._isBaseLayer = options.isBaseLayer || false;

        this._defaultTextures = options.defaultTextures || [null, null];

        this._visibility = options.visibility !== undefined ? options.visibility : true;

        this._fading = options.fading || false;

        this._fadingFactor = this._opacity / FADING_RATIO;

        if (this._fading) {
            this._fadingOpacity = this._visibility ? this._opacity : 0.0;
        } else {
            this._fadingOpacity = this._opacity;
        }

        this._height = options.height || 0;

        this._extent = new Extent();

        this.createTexture = null;

        this._textureFilter = options.textureFilter ? options.textureFilter.trim().toUpperCase() : "MIPMAP";

        this._isSRGB = options.isSRGB != undefined ? options.isSRGB : false;

        this._internalFormat = null;

        this._extentMerc = new Extent();

        // Setting the extent up
        this.setExtent(
            utils.createExtent(
                options.extent,
                new Extent(new LonLat(-180, -90), new LonLat(180, 90))
            )
        );

        /**
         * Layer picking color. Assign when added to the planet.
         * @protected
         * @type {Vec3}
         */
        this._pickingColor = new Vec3();

        this._pickingEnabled = options.pickingEnabled !== undefined ? options.pickingEnabled : true;

        this._isPreloadDone = false;

        this._preLoadZoomLevels = options.preLoadZoomLevels || [0, 1];

        this._ambient = null;
        this._diffuse = null;
        this._specular = null;

        if (options.ambient) {
            let a = utils.createColorRGB(options.ambient, new Vec3(0.2, 0.2, 0.2));
            this._ambient = new Float32Array([a.x, a.y, a.z]);
        }

        if (options.diffuse) {
            let d = utils.createColorRGB(options.diffuse, new Vec3(0.8, 0.8, 0.8));
            this._diffuse = new Float32Array([d.x, d.y, d.z]);
        }

        if (options.specular) {
            let s = utils.createColorRGB(options.specular, new Vec3(0.0003, 0.0003, 0.0003));
            let shininess = options.shininess || 20.0;
            this._specular = new Float32Array([s.x, s.y, s.z, shininess]);
        }

        this.nightTextureCoefficient = options.nightTextureCoefficient || 1.0;
    }

    public set diffuse(rgb: string | NumberArray3 | Vec3 | null | undefined) {
        if (rgb) {
            let vec = createColorRGB(rgb);
            this._diffuse = new Float32Array(vec.toArray());
        } else {
            this._diffuse = null;
        }
    }

    public set ambient(rgb: string | NumberArray3 | Vec3 | null | undefined) {
        if (rgb) {
            let vec = createColorRGB(rgb);
            this._ambient = new Float32Array(vec.toArray());
        } else {
            this._ambient = null;
        }
    }

    public set specular(rgb: string | NumberArray3 | Vec3 | null | undefined) {
        if (rgb) {
            let vec = createColorRGB(rgb);
            this._specular = new Float32Array([vec.x, vec.y, vec.y, this._specular ? this._specular[3] : 0.0]);
        } else {
            this._specular = null;
        }
    }

    public set shininess(v: number) {
        if (this._specular) {
            this._specular[3] = v;
        }
    }

    // get normalMapCreator() {
    //     return this._normalMapCreator;
    // }

    static getTMS(x: number, y: number, z: number): { x: number; y: number; z: number } {
        return {
            x: x,
            y: (1 << z) - y - 1,
            z: z
        };
    }

    static getTileIndex(...arr: number[]): string {
        return arr.join("_");
    }

    public get instanceName(): string {
        return "Layer";
    }

    public get rendererEvents(): EventsHandler<LayerEventsList> {
        return this.events;
    }

    public set opacity(opacity: number) {
        if (opacity !== this._opacity) {
            if (this._fading) {
                if (opacity > this._opacity) {
                    this._fadingFactor = (opacity - this._opacity) / FADING_RATIO;
                } else if (opacity < this._opacity) {
                    this._fadingFactor = (opacity - this._opacity) / FADING_RATIO;
                }
            } else {
                this._fadingOpacity = opacity;
            }
            this._opacity = opacity;
        }
    }

    public set pickingEnabled(picking: boolean) {
        this._pickingEnabled = picking;
    }

    public get pickingEnabled(): boolean {
        return this._pickingEnabled;
    }

    /**
     * Returns true if a layer has imagery tiles.
     * @public
     * @virtual
     * @returns {boolean} - Imagery tiles flag.
     */
    public hasImageryTiles(): boolean {
        return this._hasImageryTiles;
    }

    /**
     * Gets layer identifier.
     * @public
     * @returns {string} - Layer object id.
     */
    public getID(): number {
        return this.__id;
    }

    public get id(): number {
        return this.__id;
    }

    /**
     * @todo: remove after all
     */
    public get _id(): number {
        return this.__id;
    }

    /**
     * Compares layers instances.
     * @public
     * @param {Layer} layer - Layer instance to compare.
     * @returns {boolean} - Returns true if the layers is the same instance of the input.
     */
    public isEqual(layer: Layer): boolean {
        return layer.__id === this.__id;
    }

    /**
     * Assign the planet.
     * @protected
     * @virtual
     * @param {Planet} planet - Planet render node.
     */
    public _assignPlanet(planet: Planet) {

        this._planet = planet;

        planet._layers.push(this);

        if (planet.renderer && planet.renderer.isInitialized()) {
            // TODO: webgl1
            if (this._isSRGB) {
                this._internalFormat = planet.renderer.handler.gl!.SRGB8_ALPHA8;
            } else {
                this._internalFormat = planet.renderer.handler.gl!.RGBA8;
            }
            this.createTexture = planet.renderer.handler.createTexture[this._textureFilter];

            this.events.on("visibilitychange", planet._onLayerVisibilityChanged, planet);

            if (this._isBaseLayer && this._visibility) {
                planet.setBaseLayer(this);
            }

            planet.events.dispatch(planet.events.layeradd, this);
            this.events.dispatch(this.events.add, planet);
            planet.updateVisibleLayers();
            this._bindPicking();

            if (this._visibility && this.hasImageryTiles()) {
                this._preLoad();
            }
        }
    }

    public get isIdle(): boolean {
        return this._planet && this._planet._terrainCompletedActivated || false;
    }

    /**
     * Assign picking color to the layer.
     * @protected
     * @virtual
     */
    protected _bindPicking() {
        this._planet && this._planet.renderer && this._planet.renderer.assignPickingColor<Layer>(this);
    }

    /**
     * Adds layer to the planet.
     * @public
     * @param {Planet} planet - Adds layer to the planet.
     */
    public addTo(planet: Planet) {
        if (!this._planet) {
            this._assignPlanet(planet);
        }
    }

    /**
     * Removes from planet.
     * @public
     * @returns {Layer} -This layer.
     */
    public remove(): this {
        let p = this._planet;
        if (p) {
            //TODO: replace to planet
            for (let i = 0; i < p._layers.length; i++) {
                if (this.isEqual(p._layers[i])) {
                    p.renderer && p.renderer.clearPickingColor(this);
                    p._layers.splice(i, 1);
                    p.updateVisibleLayers();
                    this.clear();
                    p.events.dispatch(p.events.layerremove, this);
                    this.events.dispatch(this.events.remove, p);
                    this._planet = null;
                    this._internalFormat = null;
                    this.createTexture = null;
                    return this;
                }
            }
        }
        return this;
    }

    /**
     * Clears layer material.
     * @virtual
     */
    public clear() {
        if (this._planet) {
            this._planet._clearLayerMaterial(this);
        }
    }

    /**
     * Returns planet instance.
     */
    get planet(): Planet | null {
        return this._planet;
    }

    /**
     * Sets layer attribution text.
     * @public
     * @param {string} html - HTML code that represents layer attribution, it could be just a text.
     */
    public setAttribution(html: string) {
        if (this._attribution !== html) {
            this._attribution = html;
            this._planet && this._planet.updateAttributionsList();
        }
    }

    /**
     * Gets layer attribution.
     * @public
     * @returns {string} Layer attribution
     */
    public getAttribution(): string {
        return this._attribution;
    }

    /**
     * Sets height over the ground.
     * @public
     * @param {number} height - Layer height.
     */
    public setHeight(height: number) {
        this._height = height;
        this._planet && this._planet.updateVisibleLayers();
    }

    /**
     * Gets layer height.
     * @public
     * @returns {number} -
     */
    public getHeight(): number {
        return this._height;
    }

    /**
     * Sets z-index.
     * @public
     * @param {number} zIndex - Layer z-index.
     */
    public setZIndex(zIndex: number) {
        this._zIndex = zIndex;
        this._planet && this._planet.updateVisibleLayers();
    }

    /**
     * Gets z-index.
     * @public
     * @returns {number} -
     */
    public getZIndex(): number {
        return this._zIndex;
    }

    /**
     * Set zIndex to the maximal value depend on other layers on the planet.
     * @public
     */
    public bringToFront() {
        if (this._planet) {
            let vl = this._planet.visibleTileLayers;
            let l = vl[vl.length - 1];
            if (!l.isEqual(this)) {
                this.setZIndex(l.getZIndex() + 1);
            }
        }
    }

    /**
     * Returns true if the layer is a base.
     * @public
     * @returns {boolean} - Base layer flag.
     */
    public isBaseLayer(): boolean {
        return this._isBaseLayer;
    }

    /**
     * Sets base layer type true.
     * @public
     * @param {boolean} isBaseLayer -
     */
    public setBaseLayer(isBaseLayer: boolean) {
        this._isBaseLayer = isBaseLayer;
        if (this._planet) {
            if (!isBaseLayer && this._planet.baseLayer && this.isEqual(this._planet.baseLayer)) {
                this._planet.baseLayer = null;
            }
            this._planet.updateVisibleLayers();
        }
    }

    /**
     * Sets layer visibility.
     * @public
     * @virtual
     * @param {boolean} visibility - Layer visibility.
     */
    public setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            this._visibility = visibility;
            if (this._planet) {
                if (this._isBaseLayer && visibility) {
                    this._planet.setBaseLayer(this);
                }
                this._planet.updateVisibleLayers();
                if (visibility && !this._isPreloadDone && !this.isVector) {
                    this._isPreloadDone = true;
                    this._preLoad();
                }
            }
            this.events.dispatch(this.events.visibilitychange, this);
        }
    }

    protected _forceMaterialApply(segment: Segment) {
        let pm = segment.materials,
            m = pm[this.__id];

        if (!m) {
            m = pm[this.__id] = this.createMaterial(segment);
        }

        if (!m.isReady) {
            this._planet!._renderCompleted = false;
        }

        this.applyMaterial(m, true);
    }

    public clearMaterial(material: Material) {
        //empty
    }

    public loadMaterial(material: Material, forceLoading: boolean = false) {
        //empty
    }

    public applyMaterial(m: Material, isForced: boolean = false): NumberArray4 {
        return [0, 0, 1, 1];
    }

    protected _preLoadRecursive(node: Node, maxZoom: number) {
        if (node.segment.tileZoom > maxZoom) {
            return;
        }
        if (this._preLoadZoomLevels.includes(node.segment.tileZoom)) {
            this._forceMaterialApply(node.segment);
        }

        for (let i = 0, len = node.nodes.length; i < len; i++) {
            if (node.nodes[i]) {
                this._preLoadRecursive(node.nodes[i], maxZoom);
            }
        }
    }

    protected _preLoad() {
        if (this._planet && this._preLoadZoomLevels.length) {

            let p = this._planet,
                maxZoom = Math.max(...this._preLoadZoomLevels);

            for (let i = 0, len = p.quadTreeStrategy.quadTreeList.length; i < len; i++) {
                this._preLoadRecursive(p.quadTreeStrategy.quadTreeList[i], maxZoom);
            }

        }
    }

    /**
     * Gets layer visibility.
     * @public
     * @returns {boolean} - Layer visibility.
     */
    public getVisibility(): boolean {
        return this._visibility;
    }

    /**
     * Sets visible geographical extent.
     * @public
     * @param {Extent} extent - Layer visible geographical extent.
     */
    public setExtent(extent: Extent) {
        let sw = extent.southWest.clone(),
            ne = extent.northEast.clone();

        if (sw.lat < mercator.MIN_LAT) {
            sw.lat = mercator.MIN_LAT;
        }

        if (ne.lat > mercator.MAX_LAT) {
            ne.lat = mercator.MAX_LAT;
        }

        this._extent = extent.clone();
        this._extentMerc = new Extent(sw.forwardMercator(), ne.forwardMercator());

        this._correctFullExtent();
    }

    /**
     * Gets layer extent.
     * @public
     * @return {Extent} - Layer geodetic extent.
     */
    public getExtent(): Extent {
        return this._extent;
    }

    /**
     * Gets layer web-mercator extent.
     * @public
     * @return {Extent} - Layer extent.
     */
    public getExtentMerc(): Extent {
        return this._extentMerc;
    }

    /**
     * Special correction of the whole globe extent.
     * @protected
     */
    protected _correctFullExtent() {
        // var e = this._extent,
        //    em = this._extentMerc;
        // var ENLARGE_MERCATOR_LON = og.mercator.POLE + 50000;
        // var ENLARGE_MERCATOR_LAT = og.mercator.POLE + 50000;
        // if (e.northEast.lat === 90.0) {
        //    em.northEast.lat = ENLARGE_MERCATOR_LAT;
        // }
        // if (e.northEast.lon === 180.0) {
        //    em.northEast.lon = ENLARGE_MERCATOR_LON;
        // }
        // if (e.southWest.lat === -90.0) {
        //    em.southWest.lat = -ENLARGE_MERCATOR_LAT;
        // }
        // if (e.southWest.lon === -180.0) {
        //    em.southWest.lon = -ENLARGE_MERCATOR_LON;
        // }
    }

    public get opacity(): number {
        return this._opacity;
    }

    public get screenOpacity(): number {
        return this._fading ? this._fadingOpacity : this._opacity;
    }

    public _refreshFadingOpacity() {
        let p = this._planet!;
        if (
            this._visibility && p.getViewExtent().overlaps(this._extent) &&
            p.maxCurrZoom >= this.minZoom &&
            p.minCurrZoom <= this.maxZoom
        ) {
            this._fadingOpacity += this._fadingFactor;

            if (
                (this._fadingFactor > 0.0 && this._fadingOpacity > this._opacity) ||
                (this._fadingFactor < 0.0 && this._fadingOpacity < this._opacity)
            ) {
                this._fadingOpacity = this._opacity;
            }

            return false;
        } else {
            this._fadingOpacity = 0.0;
            return !this._visibility;
        }
    }

    public createMaterial(segment: Segment): Material {
        return new Material(segment, this);
    }

    public redraw() {
        if (this._planet) {

            this._planet.quadTreeStrategy.clearLayerMaterial(this);

            // this._planet._quadTree.traverseTree((n: Node) => {
            //         if (n.segment.materials[this.__id]) {
            //             n.segment.materials[this.__id].clear();
            //         }
            //     }
            // );
            //
            // this._planet._quadTreeNorth.traverseTree((n: Node) => {
            //         if (n.segment.materials[this.__id]) {
            //             n.segment.materials[this.__id].clear();
            //         }
            //     }
            // );
            //
            // this._planet._quadTreeSouth.traverseTree((n: Node) => {
            //         if (n.segment.materials[this.__id]) {
            //             n.segment.materials[this.__id].clear();
            //         }
            //     }
            // );
        }
    }

    public abortMaterialLoading(material: Material) {

    }

    public abortLoading() {

    }
}

export type LayerEventsList = [
    "visibilitychange",
    "add",
    "remove",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter"
];

export const LAYER_EVENTS: LayerEventsList = [
    /**
     * Triggered when layer visibility changed.
     * @event og.Layer#visibilitychange
     */
    "visibilitychange",

    /**
     * Triggered when layer has added to the planet.
     * @event og.Layer#add
     */
    "add",

    /**
     * Triggered when layer has removed from the planet.
     * @event og.Layer#remove
     */
    "remove",

    /**
     * Triggered when mouse moves over the layer.
     * @event og.Layer#mousemove
     */
    "mousemove",

    /**
     * Triggered when mouse has entered over the layer.
     * @event og.Layer#mouseenter
     */
    "mouseenter",

    /**
     * Triggered when mouse leaves the layer.
     * @event og.Layer#mouseenter
     */
    "mouseleave",

    /**
     * Mouse left button clicked.
     * @event og.Layer#lclick
     */
    "lclick",

    /**
     * Mouse right button clicked.
     * @event og.Layer#rclick
     */
    "rclick",

    /**
     * Mouse right button clicked.
     * @event og.Layer#mclick
     */
    "mclick",

    /**
     * Mouse left button double click.
     * @event og.Layer#ldblclick
     */
    "ldblclick",

    /**
     * Mouse right button double click.
     * @event og.Layer#rdblclick
     */
    "rdblclick",

    /**
     * Mouse middle button double click.
     * @event og.Layer#mdblclick
     */
    "mdblclick",

    /**
     * Mouse left button up(stop pressing).
     * @event og.Layer#lup
     */
    "lup",

    /**
     * Mouse right button up(stop pressing).
     * @event og.Layer#rup
     */
    "rup",

    /**
     * Mouse middle button up(stop pressing).
     * @event og.Layer#mup
     */
    "mup",

    /**
     * Mouse left button is just pressed down(start pressing).
     * @event og.Layer#ldown
     */
    "ldown",

    /**
     * Mouse right button is just pressed down(start pressing).
     * @event og.Layer#rdown
     */
    "rdown",

    /**
     * Mouse middle button is just pressed down(start pressing).
     * @event og.Layer#mdown
     */
    "mdown",

    /**
     * Mouse left button is pressing.
     * @event og.Layer#lhold
     */
    "lhold",

    /**
     * Mouse right button is pressing.
     * @event og.Layer#rhold
     */
    "rhold",

    /**
     * Mouse middle button is pressing.
     * @event og.Layer#mhold
     */
    "mhold",

    /**
     * Mouse wheel is rotated.
     * @event og.Layer#mousewheel
     */
    "mousewheel",

    /**
     * Triggered when touching moves over the layer.
     * @event og.Layer#touchmove
     */
    "touchmove",

    /**
     * Triggered when layer begins to touch.
     * @event og.Layer#touchstart
     */
    "touchstart",

    /**
     * Triggered when layer has finished touching.
     * @event og.Layer#touchend
     */
    "touchend",

    /**
     * Triggered layer has double touched.
     * @event og.Layer#doubletouch
     */
    "doubletouch",

    /**
     * Triggered when touching leaves layer borders.
     * @event og.Layer#touchleave
     */
    "touchleave",

    /**
     * Triggered when touch enters over the layer.
     * @event og.Layer#touchenter
     */
    "touchenter"
];

export {Layer};
