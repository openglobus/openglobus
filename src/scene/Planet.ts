import * as math from "../math";
import * as segmentHelper from "../segment/segmentHelper";
import * as shaders from "../shaders/drawnode";
import * as utils from "../utils/shared";
import {Atmosphere} from "../control/Atmosphere";
import {Control} from "../control/Control";
import {createColorRGB, isUndef} from "../utils/shared";
import {createEvents, EventsHandler} from "../Events";
import {decodeFloatFromRGBAArr} from "../math/coder";
import {EarthQuadTreeStrategy} from "../quadTree/EarthQuadTreeStrategy";
import {EmptyTerrain} from "../terrain/EmptyTerrain";
import {Extent} from "../Extent";
import {Entity} from "../entity/Entity";
import {Ellipsoid} from "../ellipsoid/Ellipsoid";
import {EntityCollection} from "../entity/EntityCollection";
import {Geoid, GeoidModel} from "../terrain/Geoid";
import {GeoImageCreator} from "../utils/GeoImageCreator";
import {IBaseInputState} from "../renderer/RendererEvents";
import {Key, Lock} from "../Lock";
import {Layer} from "../layer/Layer";
import {Loader} from "../utils/Loader";
import {LonLat} from "../LonLat";
import {Node} from "../quadTree/Node";
import {NormalMapCreator} from "../utils/NormalMapCreator";
import {PlainSegmentWorker} from "../utils/PlainSegmentWorker";
import {PlanetCamera} from "../camera/PlanetCamera";
import {Quat} from "../math/Quat";
import {QuadTreeStrategy} from "../quadTree/QuadTreeStrategy";
import {Ray} from "../math/Ray";
import {RenderNode} from "./RenderNode";
import {SimpleSkyBackground} from "../control/SimpleSkyBackground";
import {Sun} from "../control/Sun";
import {TerrainWorker} from "../utils/TerrainWorker";
import {Vec2, Vec3, Vec4, NumberArray2, NumberArray3, NumberArray4} from "../math/index";
import {Vector} from "../layer/Vector";
import {VectorTileCreator} from "../utils/VectorTileCreator";
import {wgs84} from "../ellipsoid/wgs84";
import {WebGLBufferExt, WebGLTextureExt, IDefaultTextureParams} from "../webgl/Handler";

export interface IPlanetParams {
    name?: string;
    ellipsoid?: Ellipsoid;
    minAltitude?: number;
    maxAltitude?: number;
    frustums?: NumberArray2[];
    maxEqualZoomAltitude?: number;
    minEqualZoomAltitude?: number;
    minEqualZoomCameraSlope?: number;
    quadTreeStrategyPrototype?: typeof QuadTreeStrategy;
    ambient?: string | NumberArray3 | Vec3;
    diffuse?: string | NumberArray3 | Vec3;
    specular?: string | NumberArray3 | Vec3;
    shininess?: number;
    nightTextureSrc?: string | null;
    specularTextureSrc?: string | null;
    maxGridSize?: number;
    maxLoadingRequests?: number;
    atmosphereEnabled?: boolean;
}

export type PlanetEventsList = [
    "draw",
    "layeradd",
    "baselayerchange",
    "layerremove",
    "layervisibilitychange",
    "rendercompleted",
    "terraincompleted",
    "layerloadend"
];

const CUR_LOD_SIZE = 250; //px
const MIN_LOD_SIZE = 312; //px
const MAX_LOD_SIZE = 190; //px

let _tempPickingPix_ = new Uint8Array(4);
let _tempDepthColor_ = new Uint8Array(4);

const DEPTH_DISTANCE = 11;//m

/**
 * Maximum created nodes count. The more nodes count the more memory usage.
 * @const
 * @type {number}
 * @default
 */
const MAX_NODES = 200;

const HORIZON_TANGENT = 0.81;

type IndexBufferCacheData = { buffer: WebGLBufferExt | null };

/**
 * Main class for rendering planet
 * @class
 * @extends {RenderNode}
 * @param {string} [options.name="Earth"] - Planet name(Earth by default)
 * @param {Ellipsoid} [options.ellipsoid] - Planet ellipsoid(WGS84 by default)
 * @param {Number} [options.maxGridSize=128] - Segment maximal grid size
 * @param {Number} [options.maxEqualZoomAltitude=15000000.0] - Maximal altitude since segments on the screen become the same zoom level
 * @param {Number} [options.minEqualZoomAltitude=10000.0] - Minimal altitude since segments on the screen become the same zoom level
 * @param {Number} [options.minEqualZoomCameraSlope=0.8] - Minimal camera slope above te globe where segments on the screen become the same zoom level
 *
 * @fires EventsHandler<PlanetEventList>#draw
 * @fires EventsHandler<PlanetEventList>#layeradd
 * @fires EventsHandler<PlanetEventList>#baselayerchange
 * @fires EventsHandler<PlanetEventList>#layerremove
 * @fires EventsHandler<PlanetEventList>#layervisibilitychange
 * @fires EventsHandler<PlanetEventList>#geoimageadd
 */
export class Planet extends RenderNode {

    public events: EventsHandler<PlanetEventsList>;

    /**
     * @public
     * @type {Ellipsoid}
     */
    public ellipsoid: Ellipsoid;

    /**
     * @public
     * @override
     * @type {Boolean}
     */
    public override lightEnabled: boolean;

    /**
     * Squared ellipsoid radius.
     * @public
     * @type {number}
     */
    public _planetRadius2: number;

    /**
     * Layers array.
     * @public
     * @type {Array.<Layer>}
     */
    public _layers: Layer[];

    /**
     * Flag to trigger layer update in a next frame
     * @type {boolean}
     * @protected
     */
    protected _updateLayer: boolean;

    /**
     * Current visible imagery tile layers array.
     * @public
     * @type {Array.<Layer>}
     */
    public visibleTileLayers: Layer[];

    /**
     * Current visible vector layers array.
     * @protected
     * @type {Array.<Layer>}
     */
    protected visibleVectorLayers: Layer[];

    protected _visibleTileLayerSlices: Layer[][];

    /**
     * Vector layers visible nodes with collections.
     * @protected
     * @type {Array.<EntityCollection>}
     */
    protected _frustumEntityCollections: EntityCollection[];

    /**
     * There is only one base layer on the globe when layer.isBaseLayer is true.
     * @public
     * @type {Layer}
     */
    public baseLayer: Layer | null;

    /**
     * Terrain provider.
     * @public
     * @type {EmptyTerrain}
     */
    public terrain: EmptyTerrain | null;

    /**
     * Camera is this.renderer.activeCamera pointer.
     * @public
     * @type {PlanetCamera}
     */
    public camera: PlanetCamera;

    public maxEqualZoomAltitude: number;
    public minEqualZoomAltitude: number;
    public minEqualZoomCameraSlope: number;

    /**
     * Screen mouse pointer projected to planet cartesian position.
     * @public
     * @type {Vec3}
     */
    public mousePositionOnEarth: Vec3;

    public emptyTexture: WebGLTextureExt | null;
    public transparentTexture: WebGLTextureExt | null;
    public defaultTexture: WebGLTextureExt | null;

    /**
     * Current visible minimal zoom index planet segment.
     * @public
     * @type {number}
     */
    public minCurrZoom: number;

    /**
     * Current visible maximal zoom index planet segment.
     * @public
     * @type {number}
     */
    public maxCurrZoom: number;

    public _viewExtent: Extent;

    protected _initialViewExtent: Extent | null;

    public _createdNodesCount: number;

    /**
     * Planet's segments collected for rendering frame.
     * @public
     * @type {Node}
     */
    public _renderedNodes: Node[];

    public _renderedNodesInFrustum: Node[][];

    /**
     * Current visible mercator segments tree nodes array.
     * @public
     * @type {Node}
     *
     * @todo
     * _visibleNodes, _visibleNodesNorth and _visibleNodesSouth should
     * be replaced to strategy and Vector layer reworked in collecting methods.
     * _visibleNodes, and _visibleNodesNorth and South are used in Vector
     * layer only, for entity terrain collision
     *
     */
    public _visibleNodes: Record<number, Node>;

    /**
     * Current visible north pole nodes tree nodes array.
     * @public
     * @type {Node}
     * @todo
     */
    public _visibleNodesNorth: Record<number, Node>;

    /**
     * Current visible south pole nodes tree nodes array.
     * @public
     * @type {Node}
     * @todo
     */
    public _visibleNodesSouth: Record<number, Node>;

    /**
     * Layers activity lock.
     * @public
     * @type {Lock}
     */
    public layerLock: Lock;

    /**
     * Terrain providers activity lock.
     * @public
     * @type {Lock}
     */
    public terrainLock: Lock;

    /**
     * Height scale factor. 1 - is normal elevation scale.
     * @public
     * @type {number}
     */
    public _heightFactor: number;

    /**
     * Precomputed indexes array for different grid size segments.
     * @protected
     * @type {Array.<Array.<number>>}
     */
    public _indexesCache: IndexBufferCacheData[][][][][];

    protected _indexesCacheToRemove: IndexBufferCacheData[];
    public _indexesCacheToRemoveCounter: number;

    /**
     * Precomputed texture coordinates buffers for different grid size segments.
     * @public
     * @type {Array.<Array.<number>>}
     */
    public _textureCoordsBufferCache: WebGLBufferExt[];

    public quadTreeStrategy: QuadTreeStrategy;

    /**
     * Night glowing gl texture.
     * @protected
     */
    protected _nightTexture: WebGLTextureExt | null;

    /**
     * Specular mask gl texture.
     * @protected
     */
    protected _specularTexture: WebGLTextureExt | null;


    public _ambient: Float32Array;
    public _diffuse: Float32Array;
    public _specular: Float32Array;

    protected _maxGridSize: number;

    /**
     * Segment multiple textures size.(4 - convenient value for the most devices)
     * @const
     * @public
     */
    public SLICE_SIZE: number;
    public SLICE_SIZE_4: number;
    public SLICE_SIZE_3: number;

    /**
     * Level of details of visible segments.
     * @protected
     * @type {number}
     */
    protected _lodSize: number;
    protected _curLodSize: number;
    protected _minLodSize: number;
    public _maxLodSize: number;

    public _pickingColorArr: Float32Array;
    public _samplerArr: Int32Array;
    public _pickingMaskArr: Int32Array;

    /**
     * GeoImage creator.
     * @public
     * @type{GeoImageCreator}
     */
    public _geoImageCreator: GeoImageCreator;

    /**
     * VectorTileCreator creator.
     * @public
     * @type{VectorTileCreator}
     */
    public _vectorTileCreator: VectorTileCreator;

    /**
     * NormalMapCreator creator.
     * @public
     * @type{NormalMapCreator}
     */
    public _normalMapCreator: NormalMapCreator;

    public _terrainWorker: TerrainWorker;

    public _plainSegmentWorker: PlainSegmentWorker;

    public _tileLoader: Loader<Layer>;

    protected _memKey: Key;

    public _distBeforeMemClear: number;

    protected _prevCamEye: Vec3;

    protected _initialized: boolean;

    protected always: any[];

    public _renderCompleted: boolean
    public _renderCompletedActivated: boolean;

    public _terrainCompleted: boolean;
    public _terrainCompletedActivated: boolean;

    protected _collectRenderNodesIsActive: boolean;

    /**
     * Night texture brightness coefficient
     * @type {number}
     */
    public nightTextureCoefficient: number;

    protected _renderScreenNodesPASS: Function;

    protected _atmosphereEnabled: boolean;
    protected _atmosphereMaxMinOpacity: Float32Array;

    public solidTextureOne: WebGLTextureExt | null;
    public solidTextureTwo: WebGLTextureExt | null;

    protected _skipPreRender: boolean;

    protected _nightTextureSrc: string | null;
    protected _specularTextureSrc: string | null;

    constructor(options: IPlanetParams = {}) {
        super(options.name);

        this.ellipsoid = options.ellipsoid || wgs84;

        this.lightEnabled = true;

        this._planetRadius2 = this.ellipsoid.getPolarSize() * this.ellipsoid.getPolarSize();

        this._layers = [];

        this._updateLayer = false;

        this.visibleTileLayers = [];

        this.visibleVectorLayers = [];

        this._visibleTileLayerSlices = [];

        this._frustumEntityCollections = [];

        this.baseLayer = null;

        this.terrain = null;

        this.camera = new PlanetCamera(this, {
            frustums: options.frustums,
            eye: new Vec3(25000000, 0, 0),
            look: Vec3.ZERO,
            up: Vec3.NORTH,
            minAltitude: options.minAltitude,
            maxAltitude: options.maxAltitude
        });

        this.maxEqualZoomAltitude = options.maxEqualZoomAltitude || 15000000.0;
        this.minEqualZoomAltitude = options.minEqualZoomAltitude || 10000.0;
        this.minEqualZoomCameraSlope = options.minEqualZoomCameraSlope || 0.8;

        this.mousePositionOnEarth = new Vec3();

        this.emptyTexture = null;
        this.transparentTexture = null;
        this.defaultTexture = null;

        this.minCurrZoom = math.MAX;

        this.maxCurrZoom = math.MIN;

        this._viewExtent = new Extent(new LonLat(180, 180), new LonLat(-180, -180));

        this._skipPreRender = false;

        this._initialViewExtent = null;

        this._createdNodesCount = 0;

        this._renderedNodes = [];
        this._renderedNodesInFrustum = [];

        this._visibleNodes = {};

        this._visibleNodesNorth = {};

        this._visibleNodesSouth = {};

        this.layerLock = new Lock();

        this.terrainLock = new Lock();

        this._heightFactor = 1.0;

        this._indexesCache = [];
        this._indexesCacheToRemove = [];
        this._indexesCacheToRemoveCounter = 0;

        this._textureCoordsBufferCache = [];

        this.quadTreeStrategy = options.quadTreeStrategyPrototype ? new options.quadTreeStrategyPrototype(this) : new EarthQuadTreeStrategy(this);

        this._nightTexture = null;

        this._specularTexture = null;

        let a = utils.createColorRGB(options.ambient, new Vec3(0.2, 0.2, 0.3));
        let d = utils.createColorRGB(options.diffuse, new Vec3(1.0, 1.0, 1.0));
        let s = utils.createColorRGB(options.specular, new Vec3(0.00063, 0.00055, 0.00032));
        let shininess = options.shininess || 18.0;

        this._ambient = new Float32Array([a.x, a.y, a.z]);
        this._diffuse = new Float32Array([d.x, d.y, d.z]);
        this._specular = new Float32Array([s.x, s.y, s.z, shininess]);

        this._maxGridSize = Math.log2(options.maxGridSize || 128);

        this.SLICE_SIZE = 4;
        this.SLICE_SIZE_4 = this.SLICE_SIZE * 4;
        this.SLICE_SIZE_3 = this.SLICE_SIZE * 3;

        this._lodSize = CUR_LOD_SIZE;
        this._curLodSize = CUR_LOD_SIZE;
        this._minLodSize = MIN_LOD_SIZE;
        this._maxLodSize = MAX_LOD_SIZE;

        this._pickingColorArr = new Float32Array(this.SLICE_SIZE_4);
        this._samplerArr = new Int32Array(this.SLICE_SIZE);
        this._pickingMaskArr = new Int32Array(this.SLICE_SIZE);

        this._geoImageCreator = new GeoImageCreator(this);

        this._vectorTileCreator = new VectorTileCreator(this);

        this._normalMapCreator = new NormalMapCreator(this);

        this._terrainWorker = new TerrainWorker(3);

        this._plainSegmentWorker = new PlainSegmentWorker(3);

        this._tileLoader = new Loader(options.maxLoadingRequests || 12);

        this._memKey = new Key();

        this.events = createEvents<PlanetEventsList>(PLANET_EVENTS);

        this._distBeforeMemClear = 0.0;

        this._prevCamEye = new Vec3();

        this._initialized = false;

        this.always = [];

        this._renderCompleted = false;
        this._renderCompletedActivated = false;

        this._terrainCompleted = false;
        this._terrainCompletedActivated = false;
        this._collectRenderNodesIsActive = true;

        this.nightTextureCoefficient = 2.0;

        this._renderScreenNodesPASS = this._renderScreenNodesPASSNoAtmos;

        this._atmosphereEnabled = options.atmosphereEnabled || false;
        this._atmosphereMaxMinOpacity = new Float32Array([1.0, 0.41]);

        this.solidTextureOne = null;
        this.solidTextureTwo = null;

        this._nightTextureSrc = options.nightTextureSrc || null;
        this._specularTextureSrc = options.specularTextureSrc || null;
    }

    public get maxGridSize(): number {
        return this._maxGridSize;
    }

    public getNorthFrameRotation(cartesian: Vec3): Quat {
        return this.ellipsoid.getNorthFrameRotation(cartesian);
    }

    public set atmosphereMaxOpacity(opacity: number) {
        this._atmosphereMaxMinOpacity[0] = opacity;
    }

    public get atmosphereMaxOpacity(): number {
        return this._atmosphereMaxMinOpacity[0];
    }

    public set atmosphereMinOpacity(opacity: number) {
        this._atmosphereMaxMinOpacity[1] = opacity;
    }

    public get atmosphereMinOpacity(): number {
        return this._atmosphereMaxMinOpacity[1];
    }

    public set atmosphereEnabled(enabled: boolean) {
        if (enabled != this._atmosphereEnabled) {
            this._atmosphereEnabled = enabled;
            this._initializeAtmosphere();
        }
    }

    public get atmosphereEnabled(): boolean {
        return this._atmosphereEnabled;
    }

    public set diffuse(rgb: string | NumberArray3 | Vec3) {
        let vec = createColorRGB(rgb);
        this._diffuse = new Float32Array(vec.toArray());
    }

    public set ambient(rgb: string | NumberArray3 | Vec3) {
        let vec = createColorRGB(rgb);
        this._ambient = new Float32Array(vec.toArray());
    }

    public set specular(rgb: string | NumberArray3 | Vec3) {
        let vec = createColorRGB(rgb);
        this._specular = new Float32Array([vec.x, vec.y, vec.y, this._specular[3]]);
    }

    public set shininess(v: number) {
        this._specular[3] = v;
    }

    public get normalMapCreator(): NormalMapCreator {
        return this._normalMapCreator;
    }

    public get layers(): Layer[] {
        return [...this._layers];
    }

    /**
     * @todo: remove after tests
     * Get the collection of layers associated with this planet.
     * @return {Array.<Layer>} Layers array.
     * @public
     */
    public getLayers(): Layer[] {
        return this.layers;
    }


    public get sunPos(): Vec3 {
        return (this.renderer!.controls.sun as Sun).sunlight.getPosition();
    }

    /**
     * Add the given control to the renderer of the planet scene.
     * @param {Control} control - Control.
     */
    public addControl(control: Control) {
        control.planet = this;
        control.addTo(this.renderer!);
    }

    public get lodSize(): number {
        return this._lodSize;
    }

    public setLodSize(currentLodSize: number, minLodSize?: number, maxLodSize?: number) {
        this._maxLodSize = maxLodSize || this._maxLodSize;
        this._minLodSize = minLodSize || this._minLodSize;
        this._curLodSize = currentLodSize;
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;
    }

    /**
     * Add the given controls array to the renderer of the planet.
     * @param {Array.<Control>} cArr - Control array.
     */
    public addControls(cArr: Control[]) {
        for (let i = 0; i < cArr.length; i++) {
            this.addControl(cArr[i]);
        }
    }

    /**
     * Return layer by it name
     * @param {string} name - Name of the layer. og.Layer.prototype.name
     * @public
     * @returns {Layer} -
     */
    public getLayerByName(name: string): Layer | undefined {
        for (let i = 0, len = this._layers.length; i < len; i++) {
            if (name === this._layers[i].name) {
                return this._layers[i];
            }
        }
    }

    /**
     * Adds layer to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    public addLayer(layer: Layer) {
        layer.addTo(this);
    }

    /**
     * Dispatch layer visibility changing event.
     * @param {Layer} layer - Changed layer.
     * @public
     */
    public _onLayerVisibilityChanged(layer: Layer) {
        this.events.dispatch(this.events.layervisibilitychange, layer);
    }

    /**
     * Adds the given layers array to the planet.
     * @param {Array.<Layer>} layers - Layers array.
     * @public
     */
    public addLayers(layers: Layer[]) {
        for (let i = 0, len = layers.length; i < len; i++) {
            this.addLayer(layers[i]);
        }
    }

    /**
     * Removes the given layer from the planet.
     * @param {Layer} layer - Layer to remove.
     * @public
     */
    public removeLayer(layer: Layer) {
        layer.remove();
    }

    /**
     *
     * @public
     * @param {Layer} layer - Material layer.
     */
    public _clearLayerMaterial(layer: Layer) {
        this.quadTreeStrategy.clearLayerMaterial(layer);
    }

    /**
     * Sets base layer coverage to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    public setBaseLayer(layer: Layer) {
        if (this.baseLayer) {
            if (!this.baseLayer.isEqual(layer)) {
                this.baseLayer.setVisibility(false);
                this.baseLayer = layer;
                layer.setVisibility(true);
                this.events.dispatch(this.events.baselayerchange, layer);
            }
        } else {
            this.baseLayer = layer;
            this.baseLayer.setVisibility(true);
            this.events.dispatch(this.events.baselayerchange, layer);
        }
    }

    /**
     * Sets elevation scale. 1.0 is default.
     * @param {number} factor - Elevation scale.
     */
    public setHeightFactor(factor: number) {
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;

        if (this._heightFactor !== factor) {
            this._heightFactor = factor;
            this.quadTreeStrategy.destroyBranches();
            this._clearRenderedNodeList();
            this._clearRenderNodesInFrustum();
        }
    }

    /**
     * Gets elevation scale.
     * @returns {number} Terrain elevation scale
     */
    public getHeightFactor(): number {
        return this._heightFactor;
    }

    /**
     * Sets terrain provider
     * @public
     * @param {EmptyTerrain} terrain - Terrain provider.
     */
    public setTerrain(terrain: EmptyTerrain) {
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;

        if (this._initialized) {
            this.memClear();
        }

        if (this.terrain) {
            this.terrain.abortLoading();
            this.terrain.clearCache();
            this.terrain._planet = null;
        }

        this.terrain = terrain;
        this.terrain._planet = this;

        this.quadTreeStrategy.destroyBranches();

        if (terrain._geoid.model) {
            this._plainSegmentWorker.setGeoid(terrain.getGeoid());
            terrain._isReady = true;
        } else {
            Geoid.loadModel(terrain.geoid.src)
                .then((m: GeoidModel | null) => {
                    terrain.geoid.setModel(m);
                    this._plainSegmentWorker.setGeoid(terrain.getGeoid());
                    terrain._isReady = true;
                })
                .catch((err) => {
                    console.warn(err);
                });
        }
    }

    protected _initializeAtmosphere() {
        let h = this.renderer!.handler;
        h.removeProgram("drawnode_screen_wl");

        if (this._atmosphereEnabled) {

            this._renderScreenNodesPASS = this._renderScreenNodesPASSAtmos;

            if (h.isWebGl2()) {
                h.addProgram(shaders.drawnode_screen_wl_webgl2Atmos(), true);
            } else {
                h.addProgram(shaders.drawnode_screen_wl_webgl1NoAtmos(), true);
            }

            if (!this.renderer!.controls.Atmosphere) {
                this.addControl(new Atmosphere());
            } else {
                this.renderer!.controls.Atmosphere.activate();
            }

            if (this.renderer!.controls.SimpleSkyBackground) {
                this.renderer!.controls.SimpleSkyBackground.deactivate();
            }

        } else {

            this._renderScreenNodesPASS = this._renderScreenNodesPASSNoAtmos;

            if (this.renderer!.controls.Atmosphere) {
                this.renderer!.controls.Atmosphere.deactivate();
            }

            if (!this.renderer!.controls.SimpleSkyBackground) {
                this.addControl(new SimpleSkyBackground());
            } else {
                this.renderer!.controls.SimpleSkyBackground.activate();
            }

            if (h.isWebGl2()) {
                h.addProgram(shaders.drawnode_screen_wl_webgl2NoAtmos(), true);
            } else {
                h.addProgram(shaders.drawnode_screen_wl_webgl1NoAtmos(), true);
            }
        }
    }

    protected _initializeShaders() {
        let h = this.renderer!.handler;

        h.addProgram(shaders.drawnode_screen_nl(), true);
        h.addProgram(shaders.drawnode_colorPicking(), true);
        h.addProgram(shaders.drawnode_depth(), true);
        h.addProgram(shaders.drawnode_heightPicking(), true);

        this.renderer!.addPickingCallback(this, this._renderColorPickingFramebufferPASS);
        this.renderer!.addDepthCallback(this, this._renderDepthFramebufferPASS);
        this.renderer!.addDistanceCallback(this, this._renderDistanceFramebufferPASS);
    }

    protected _onLayerLoadend(layer: Layer) {
        this.events.dispatch(this.events.layerloadend, layer);
    }

    public override init() {

        this._tileLoader.events.on("layerloadend", this._onLayerLoadend, this);

        // Initialization indexes table
        segmentHelper.getInstance().setMaxGridSize(this._maxGridSize);

        const TABLESIZE = this._maxGridSize;

        let kk = 0;
        // Initialization indexes buffers cache. It takes about 120mb RAM!
        for (let i = 0; i <= TABLESIZE; i++) {
            !this._indexesCache[i] && (this._indexesCache[i] = new Array(TABLESIZE));
            for (let j = 0; j <= TABLESIZE; j++) {
                !this._indexesCache[i][j] && (this._indexesCache[i][j] = new Array(TABLESIZE));
                for (let k = 0; k <= TABLESIZE; k++) {
                    !this._indexesCache[i][j][k] && (this._indexesCache[i][j][k] = new Array(TABLESIZE));
                    for (let m = 0; m <= TABLESIZE; m++) {
                        !this._indexesCache[i][j][k][m] && (this._indexesCache[i][j][k][m] = new Array(TABLESIZE));
                        for (let q = 0; q <= TABLESIZE; q++) {

                            let ptr: IndexBufferCacheData = {
                                buffer: null
                            };

                            if (i >= 1 && i === j && i === k && i === m && i === q) {
                                let indexes = segmentHelper.getInstance().createSegmentIndexes(i, [j, k, m, q]);
                                ptr.buffer = this.renderer!.handler.createElementArrayBuffer(indexes, 1);
                            } else {
                                this._indexesCacheToRemove[kk++] = ptr;
                            }

                            this._indexesCache[i][j][k][m][q] = ptr;
                        }
                    }
                }
            }
        }

        this.renderer!.events.on("resize", () => {
            this._renderCompletedActivated = false;
            this._terrainCompletedActivated = false;
        });

        // Initialize texture coordinates buffer pool
        this._textureCoordsBufferCache = [];

        let texCoordCache = segmentHelper.getInstance().initTextureCoordsTable(TABLESIZE + 1);

        for (let i = 0; i <= TABLESIZE; i++) {
            this._textureCoordsBufferCache[i] = this.renderer!.handler.createArrayBuffer(texCoordCache[i], 2, ((1 << i) + 1) * ((1 << i) + 1));
        }

        // creating empty textures
        this.renderer!.handler.createDefaultTexture(null, (t: WebGLTextureExt) => {
            this.solidTextureOne = t;
            this.solidTextureTwo = t;
        });

        this.transparentTexture = this.renderer!.handler.transparentTexture;

        this._renderedNodesInFrustum = new Array(this.camera.frustums.length);
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i] = [];
        }

        // Creating quad trees nodes
        this.quadTreeStrategy.init();

        this.drawMode = this.renderer!.handler.gl!.TRIANGLE_STRIP;

        // Applying shaders
        this._initializeShaders();

        this._initializeAtmosphere();

        this._updateVisibleLayers();

        this.renderer!.addPickingCallback(this, this._frustumEntityCollectionPickingCallback);

        // loading Earth night glowing texture
        if (this._nightTextureSrc) {

            let img = new Image();
            img.onload = () => {
                this._nightTexture = this.renderer!.handler.createTextureDefault(img)!;
                this._nightTexture.default = true;
            };
            img.src = this._nightTextureSrc;

            // createImageBitmap(NIGHT).then((e: ImageBitmap) => {
            //     this._nightTexture = this.renderer!.handler!.createTextureDefault(e);
            // });
        }

        // load water specular mask
        if (this._specularTextureSrc) {
            let img = new Image();
            img.onload = () => {
                this._specularTexture = this.renderer!.handler.createTextureDefault(img)!;
                this._specularTexture.default = true;
            };
            img.src = this._specularTextureSrc;

            // createImageBitmap(SPECULAR).then((e: ImageBitmap) => {
            //     this._specularTexture = this.renderer!.handler!.createTexture_l(e);
            // });
        }

        this._geoImageCreator.init();

        this._vectorTileCreator.init();

        this._normalMapCreator.init();

        this.renderer!.events.on("draw", this._globalPreDraw, this, -100);

        // Loading first nodes for better viewing if you have started on a lower altitude.
        this._preRender();

        this.renderer!.events.on("postdraw", () => {
            this._checkRendercompleted();
        });

        this.initLayers();

        this._initialized = true;

        //
        // after init
        //
        if (this._initialViewExtent) {
            this.viewExtent(this._initialViewExtent);
        }

        this.renderer!.activeCamera = this.camera;
        this.camera.bindRenderer(this.renderer!);
        this.camera.update();
    }

    public initLayers() {
        let temp = [...this._layers];
        for (let i = 0; i < temp.length; i++) {
            this.removeLayer(temp[i]);
            this.addLayer(temp[i]);
        }
    }

    protected _clearIndexesCache() {
        this._indexesCacheToRemoveCounter = 0;
        let c = this._indexesCacheToRemove,
            gl = this.renderer!.handler.gl!;
        for (let i = 0, len = c.length; i < len; i++) {
            let ci = c[i];
            gl.deleteBuffer(ci.buffer as WebGLBuffer);
            ci.buffer = null;
        }
    }

    protected _preRender() {
        this.quadTreeStrategy.preRender();
        this._preLoad();
    }

    protected _preLoad() {
        this._clearRenderedNodeList();
        this._skipPreRender = false;
        this.quadTreeStrategy.preLoad();
    }

    /**
     * Creates default textures first for the North Pole and whole globe and second for the South Pole.
     * @public
     * @param{IDefaultTextureParams} param0 -
     * @param{IDefaultTextureParams} param1 -
     */
    public createDefaultTextures(param0: IDefaultTextureParams, param1: IDefaultTextureParams) {
        this.renderer!.handler.gl!.deleteTexture(this.solidTextureOne!);
        this.renderer!.handler.gl!.deleteTexture(this.solidTextureTwo!);
        this.renderer!.handler.createDefaultTexture(param0, (texture: WebGLTextureExt) => {
            this.solidTextureOne = texture;
        });
        this.renderer!.handler.createDefaultTexture(param1, (texture: WebGLTextureExt) => {
            this.solidTextureTwo = texture;
        });
    }

    protected _getLayerAttributionHTML(layer: Layer) {
        return `<div class="og-attribution__layer">${layer.getAttribution()}</div>`;
    }

    /**
     * Updates attribution lists
     * @public
     */
    public updateAttributionsList() {
        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li.getVisibility()) {
                if (li.getAttribution().length) {
                    html += this._getLayerAttributionHTML(li);
                }
            }
        }
        this._applyAttribution(html)
    }

    public updateVisibleLayers() {
        this._updateLayer = true;
    }

    protected _updateVisibleLayers() {
        this.visibleTileLayers = [];
        this.visibleTileLayers.length = 0;

        this.visibleVectorLayers = [];
        this.visibleVectorLayers.length = 0;

        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li.getVisibility()) {
                if (li.isBaseLayer()) {
                    this.createDefaultTextures(li._defaultTextures[0]!, li._defaultTextures[1]!);
                    this.baseLayer = li;
                }

                if (li.hasImageryTiles()) {
                    this.visibleTileLayers.push(li);
                }

                if (li.isVector) {
                    this.visibleVectorLayers.push(li);
                }

                if (li.getAttribution().length) {
                    html += this._getLayerAttributionHTML(li);
                }

            } else if (li._fading && li._fadingOpacity > 0) {
                if (li.hasImageryTiles()) {
                    this.visibleTileLayers.push(li);
                }

                if (li.isVector) {
                    this.visibleVectorLayers.push(li);
                }
            }
        }

        this._applyAttribution(html);

        this._sortLayers();
    }

    /**
     * Apply to render list of layer attributions
     * @protected
     */
    protected _applyAttribution(html: string) {
        if (this.renderer && this.renderer.div) {
            if (html.length) {
                if (this.renderer.div.attributions!.innerHTML !== html) {
                    this.renderer.div.attributions!.innerHTML = html;
                }
            } else {
                this.renderer.div.attributions!.innerHTML = "";
            }
        }
    }

    /**
     * Sort visible layer - preparing for rendering.
     * @protected
     */
    protected _sortLayers() {

        this.visibleVectorLayers.sort((a, b) => (a.getZIndex() - b.getZIndex()) || (a.getHeight() - b.getHeight()));

        this._visibleTileLayerSlices = [];
        this._visibleTileLayerSlices.length = 0;

        if (this.visibleTileLayers.length) {
            this.visibleTileLayers.sort((a, b) => (a.getHeight() - b.getHeight()) || (a.getZIndex() - b.getZIndex()));

            let k = -1;
            let currHeight = this.visibleTileLayers[0].getHeight();
            for (let i = 0, len = this.visibleTileLayers.length; i < len; i++) {
                if (i % this.SLICE_SIZE === 0 || this.visibleTileLayers[i].getHeight() !== currHeight) {
                    k++;
                    this._visibleTileLayerSlices[k] = [];
                    currHeight = this.visibleTileLayers[i].getHeight();
                }
                this._visibleTileLayerSlices[k].push(this.visibleTileLayers[i]);
            }
        }
    }

    protected _clearRenderedNodeList() {
        this._renderedNodes.length = 0;
        this._renderedNodes = [];
    }

    protected _clearRenderNodesInFrustum() {
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i].length = 0;
            this._renderedNodesInFrustum[i] = [];
        }
    }

    /**
     * Collects visible quad nodes.
     * @protected
     */
    protected _collectRenderNodes() {
        let cam = this.camera;
        this._lodSize = math.lerp(cam.slope < 0.0 ? 0.0 : cam.slope, this._curLodSize, this._minLodSize);

        cam._insideSegment = null;

        // clear first
        this._clearRenderedNodeList();
        this._clearRenderNodesInFrustum();

        this._viewExtent.southWest.set(180, 180);
        this._viewExtent.northEast.set(-180, -180);

        this._visibleNodes = {};
        this._visibleNodesNorth = {};
        this._visibleNodesSouth = {};

        this.minCurrZoom = math.MAX;
        this.maxCurrZoom = math.MIN;

        this.quadTreeStrategy.collectRenderNodes();

        if (cam.slope > this.minEqualZoomCameraSlope && cam._lonLat.height < this.maxEqualZoomAltitude && cam._lonLat.height > this.minEqualZoomAltitude) {

            this.minCurrZoom = this.maxCurrZoom;

            let temp = this._renderedNodes, rf = this._renderedNodesInFrustum, temp2 = [];

            this._clearRenderNodesInFrustum();
            this._renderedNodes = [];

            for (let i = 0, len = temp.length; i < len; i++) {
                let ri = temp[i];
                let ht = ri.segment.centerNormal.dot(cam._b);
                if (ri.segment.tileZoom === this.maxCurrZoom || ht < HORIZON_TANGENT) {
                    this._renderedNodes.push(ri);
                    let k = 0, inFrustum = ri.inFrustum;
                    while (inFrustum) {
                        if (inFrustum & 1) {
                            rf[k].push(ri);
                        }
                        k++;
                        inFrustum >>= 1;
                    }
                } else {
                    temp2.push(ri);
                }
            }

            for (let i = 0, len = temp2.length; i < len; i++) {
                temp2[i].renderTree(cam, this.maxCurrZoom, null);
            }
        }
    }

    protected _globalPreDraw() {
        let cam = this.camera;

        // Might be it's better to replace it in setTerrain,
        // but we have to be sure that setTerrain exists with renderer insttance
        this.renderer!.__useDistanceFramebuffer__ = !this.terrain!.isEmpty;

        this._distBeforeMemClear += this._prevCamEye.distance(cam.eye);
        this._prevCamEye.copy(cam.eye);
        cam.checkFly();

        // free memory
        if (this._createdNodesCount > MAX_NODES && this._distBeforeMemClear > 1000.0) {
            this.terrain!.clearCache();
            this.memClear();
        }

        if (this._indexesCacheToRemoveCounter > 600) {
            this._clearIndexesCache();
        }
    }

    /**
     * Render node callback.
     * @public
     */
    public override preFrame() {

        if (this._updateLayer) {
            this._updateLayer = false;
            this._updateVisibleLayers();
        }

        if (this.camera.isFirstPass) {
            this.camera.update();

            if (this._skipPreRender && this._collectRenderNodesIsActive) {
                this._collectRenderNodes();
            }

            this._skipPreRender = true;

            this.transformLights();

            // creates terrain normal maps
            this._normalMapCreator.frame();

            // Creating geoImages textures.
            this._geoImageCreator.frame();

            // Vector tiles rasterization
            this._vectorTileCreator.frame();

            this.camera.checkTerrainCollision();
            this.camera.update();

            // Here is the planet node dispatches a draw event before
            // rendering begins, and we have got render nodes.
            this.events.dispatch(this.events.draw, this);

            // Collect entity collections from vector layers
            this._collectVectorLayerCollections();
        }

        this.drawEntityCollections(this._frustumEntityCollections);
    }

    /**
     * Render node callback.
     * @public
     * @override
     */
    public override frame() {
        this._renderScreenNodesPASS();
    }

    protected _checkRendercompleted() {
        if (this._renderCompleted) {
            if (!this._renderCompletedActivated) {
                this._renderCompletedActivated = true;
                this.events.dispatch(this.events.rendercompleted, true);
            }
        } else {
            this._renderCompletedActivated = false;
        }
        this._renderCompleted = true;

        if (this._terrainCompleted) {
            if (!this._terrainCompletedActivated) {
                this._terrainCompletedActivated = true;
                this.events.dispatch(this.events.terraincompleted, true);
            }
        } else {
            this._terrainCompletedActivated = false;
        }

        this._terrainCompleted = true;
    }

    public lockQuadTree() {
        this._collectRenderNodesIsActive = false;
        this.camera.setTerrainCollisionActivity(false);
    }

    public unlockQuadTree() {
        this._collectRenderNodesIsActive = true;
        this.camera.setTerrainCollisionActivity(true);
    }

    protected _renderScreenNodesPASSNoAtmos() {

        let sh, shu;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        let cam = (renderer.activeCamera as PlanetCamera)!;
        let firstPass = cam.isFirstPass;
        let frustumIndex = cam.currentFrustumIndex;

        gl.enable(gl.CULL_FACE);

        renderer.enableBlendOneSrcAlpha();

        if (this.lightEnabled) {
            h.programs.drawnode_screen_wl.activate();
            sh = h.programs.drawnode_screen_wl._program;
            shu = sh.uniforms;

            gl.uniform3fv(shu.lightsPositions, this._lightsPositions);
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

            if (this.baseLayer) {
                gl.uniform3fv(shu.diffuse, this.baseLayer._diffuse || this._diffuse);
                gl.uniform3fv(shu.ambient, this.baseLayer._ambient || this._ambient);
                gl.uniform4fv(shu.specular, this.baseLayer._specular || this._specular);
                gl.uniform1f(shu.nightTextureCoefficient, this.baseLayer.nightTextureCoefficient || this.nightTextureCoefficient);
            } else {
                gl.uniform3fv(shu.diffuse, this._diffuse);
                gl.uniform3fv(shu.ambient, this._ambient);
                gl.uniform4fv(shu.specular, this._specular);
                gl.uniform1f(shu.nightTextureCoefficient, this.nightTextureCoefficient);
            }

            //
            // Night and specular
            //
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, this._nightTexture as WebGLTextureExt || this.transparentTexture as WebGLTextureExt);
            gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
            gl.bindTexture(gl.TEXTURE_2D, this._specularTexture as WebGLTextureExt || this.transparentTexture as WebGLTexture);
            gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

            gl.uniform1f(shu.camHeight, cam.getHeight());

        } else {
            h.programs.drawnode_screen_nl.activate();
            sh = h.programs.drawnode_screen_nl._program;
            shu = sh.uniforms;
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        }

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        //
        // drawing planet nodes
        //
        let rn = this._renderedNodesInFrustum[frustumIndex],
            sl = this._visibleTileLayerSlices;

        if (sl.length) {
            let sli = sl[0];
            for (let i = sli.length - 1; i >= 0; --i) {
                let li = sli[i];
                if (li._fading && firstPass && li._refreshFadingOpacity()) {
                    sli.splice(i, 1);
                }
            }
        }

        let isEq = this.terrain!.equalizeVertices;
        let i = rn.length;
        while (i--) {
            let s = rn[i].segment;
            isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.screenRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        //gl.disable(gl.CULL_FACE);
        for (let j = 1, len = sl.length; j < len; j++) {
            let slj = sl[j];
            for (i = slj.length - 1; i >= 0; --i) {
                let li = slj[i];
                if (li._fading && firstPass && li._refreshFadingOpacity()) {
                    slj.splice(i, 1);
                }
            }

            gl.polygonOffset(0, -j);
            i = rn.length;
            while (i--) {
                rn[i].segment.screenRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        //gl.enable(gl.CULL_FACE);
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    protected _renderScreenNodesPASSAtmos() {

        let sh, shu;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        let cam = (renderer.activeCamera as PlanetCamera)!;
        let firstPass = cam.isFirstPass;
        let frustumIndex = cam.currentFrustumIndex;

        gl.enable(gl.CULL_FACE);

        renderer.enableBlendOneSrcAlpha();

        if (this.lightEnabled) {
            h.programs.drawnode_screen_wl.activate();
            sh = h.programs.drawnode_screen_wl._program;
            shu = sh.uniforms;

            gl.uniform3fv(shu.lightsPositions, this._lightsPositions);
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

            if (this.baseLayer) {
                gl.uniform3fv(shu.diffuse, this.baseLayer._diffuse || this._diffuse);
                gl.uniform3fv(shu.ambient, this.baseLayer._ambient || this._ambient);
                gl.uniform4fv(shu.specular, this.baseLayer._specular || this._specular);
                gl.uniform1f(shu.nightTextureCoefficient, this.baseLayer.nightTextureCoefficient || this.nightTextureCoefficient);
            } else {
                gl.uniform3fv(shu.diffuse, this._diffuse);
                gl.uniform3fv(shu.ambient, this._ambient);
                gl.uniform4fv(shu.specular, this._specular);
                gl.uniform1f(shu.nightTextureCoefficient, this.nightTextureCoefficient);
            }

            gl.uniform2fv(shu.maxMinOpacity, this._atmosphereMaxMinOpacity);

            //
            // Night and specular
            //
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, this._nightTexture as WebGLTexture || this.transparentTexture as WebGLTexture);
            gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
            gl.bindTexture(gl.TEXTURE_2D, this._specularTexture as WebGLTexture || this.transparentTexture as WebGLTexture);
            gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

            //
            // atmos precomputed textures
            //
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 4);
            gl.bindTexture(gl.TEXTURE_2D, (renderer.controls.Atmosphere as Atmosphere)._transmittanceBuffer!.textures[0]);
            gl.uniform1i(shu.transmittanceTexture, this.SLICE_SIZE + 4);

            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 5);
            gl.bindTexture(gl.TEXTURE_2D, (renderer.controls.Atmosphere as Atmosphere)._scatteringBuffer!.textures[0]);
            gl.uniform1i(shu.scatteringTexture, this.SLICE_SIZE + 5);

            gl.uniform1f(shu.camHeight, cam.getHeight());

        } else {
            h.programs.drawnode_screen_nl.activate();
            sh = h.programs.drawnode_screen_nl._program;
            shu = sh.uniforms;
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        }

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        //
        // drawing planet nodes
        //
        let rn = this._renderedNodesInFrustum[frustumIndex],
            sl = this._visibleTileLayerSlices;

        if (sl.length) {
            let sli = sl[0];
            for (let i = sli.length - 1; i >= 0; --i) {
                let li = sli[i];
                if (li._fading && firstPass && li._refreshFadingOpacity()) {
                    sli.splice(i, 1);
                }
            }
        }

        let isEq = this.terrain!.equalizeVertices;
        let i = rn.length;
        while (i--) {
            let s = rn[i].segment;
            isEq && s.equalize();
            s.readyToEngage && s.engage();
            s.screenRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {
            let slj = sl[j];
            for (i = slj.length - 1; i >= 0; --i) {
                let li = slj[i];
                if (li._fading && firstPass && li._refreshFadingOpacity()) {
                    slj.splice(i, 1);
                }
            }

            gl.polygonOffset(0, -j);
            i = rn.length;
            while (i--) {
                rn[i].segment.screenRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    protected _renderDistanceFramebufferPASS() {
        if (!this.terrain!.isEmpty) {

            let sh;
            let renderer = this.renderer!;
            let h = renderer.handler;
            let gl = h.gl!;
            let cam = (renderer.activeCamera as PlanetCamera)!;

            h.programs.drawnode_heightPicking.activate();
            sh = h.programs.drawnode_heightPicking._program;
            let shu = sh.uniforms;

            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

            gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

            // drawing planet nodes
            let rn = this._renderedNodesInFrustum[cam.currentFrustumIndex];
            let sl = this._visibleTileLayerSlices;

            let i = rn.length;
            while (i--) {
                rn[i].segment.heightPickingRendering(sh, sl[0]);
            }
        }
    }

    protected _renderColorPickingFramebufferPASS() {
        let sh;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        h.programs.drawnode_colorPicking.activate();
        sh = h.programs.drawnode_colorPicking._program;
        let shu = sh.uniforms;
        let cam = renderer.activeCamera!;

        // Special blend
        // gl.enable(gl.BLEND);
        // gl.blendEquation(gl.FUNC_ADD);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.CULL_FACE);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        // drawing planet nodes
        let rn = this._renderedNodesInFrustum[cam.getCurrentFrustum()];
        let sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            rn[i].segment.colorPickingRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {
            i = rn.length;
            gl.polygonOffset(0, -j);
            while (i--) {
                rn[i].segment.colorPickingRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    protected _renderDepthFramebufferPASS() {
        let sh;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        h.programs.drawnode_depth.activate();
        sh = h.programs.drawnode_depth._program;
        let shu = sh.uniforms;
        let cam = renderer.activeCamera!;

        gl.disable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        gl.uniform3fv(shu.frustumPickingColor, cam.frustum._pickingColorU);

        // drawing planet nodes
        let rn = this._renderedNodesInFrustum[cam.getCurrentFrustum()],
            sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            rn[i].segment.depthRendering(sh, sl[0]);
        }

        gl.enable(gl.BLEND);
    }

    protected _collectVectorLayerCollections() {
        this._frustumEntityCollections.length = 0;
        this._frustumEntityCollections = [];

        let i = this.visibleVectorLayers.length;
        while (i--) {
            let vi = this.visibleVectorLayers[i] as Vector;

            if (vi._fading && vi._refreshFadingOpacity()) {
                this.visibleVectorLayers.splice(i, 1);
            }

            vi.collectVisibleCollections(this._frustumEntityCollections);
            vi.update();
        }
    }

    protected _frustumEntityCollectionPickingCallback() {
        this.drawPickingEntityCollections(this._frustumEntityCollections);
    }

    /**
     * Starts clear memory thread.
     * @public
     */
    public memClear() {
        this._distBeforeMemClear = 0;

        this.camera._insideSegment = null;

        this.layerLock.lock(this._memKey);
        this.terrainLock.lock(this._memKey);
        this._normalMapCreator.lock(this._memKey);

        this._normalMapCreator.clear();
        this.terrain!.abortLoading();
        this._tileLoader.abortAll();

        this.quadTreeStrategy.clear();
        this.layerLock.free(this._memKey);
        this.terrainLock.free(this._memKey);
        this._normalMapCreator.free(this._memKey);

        this._createdNodesCount = 0;
    }

    /**
     * Returns ray vector hit ellipsoid coordinates.
     * If the ray doesn't hit ellipsoid it returns 'undefined'.
     * @public
     * @param {Ray} ray - Ray.
     * @returns {Vec3 | undefined} -
     */
    public getRayIntersectionEllipsoid(ray: Ray): Vec3 | undefined {
        return this.ellipsoid.hitRay(ray.origin, ray.direction);
    }

    /**
     * Project screen coordinates to the planet ellipsoid.
     * @public
     * @param {Vec2 | IBaseInputState } px - Screen coordinates.
     * @returns {Vec3 | undefined} - Cartesian coordinates.
     */
    public getCartesianFromPixelEllipsoid(px: Vec2 | IBaseInputState): Vec3 | undefined {
        let cam = this.renderer!.activeCamera!;
        return this.ellipsoid.hitRay(cam.eye, cam.unproject(px.x, px.y));
    }

    /**
     * Project screen coordinates to the planet ellipsoid.
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {LonLat | undefined} - Geodetic coordinates.
     */
    public getLonLatFromPixelEllipsoid(px: Vec2): LonLat | undefined {
        let coords = this.getCartesianFromPixelEllipsoid(px);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
    }

    /**
     * Returns mouse position cartesian coordinates on the current terrain.
     * @public
     * @returns {Vec3 | undefined} -
     */
    public getCartesianFromMouseTerrain(): Vec3 | undefined {
        let ms = this.renderer!.events.mouseState;
        let distance = this.getDistanceFromPixel(ms);
        if (distance) {
            return ms.direction.scaleTo(distance).addA(this.renderer!.activeCamera!.eye);
        }
    }

    /**
     * Returns screen coordinates cartesian coordinates on the current terrain.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2} px - Pixel screen 2d coordinates.
     * @returns {Vec3 | undefined} -
     */
    public getCartesianFromPixelTerrain(px: Vec2 | IBaseInputState): Vec3 | undefined {
        let distance = this.getDistanceFromPixel(px);
        if (distance) {
            let direction = (px as IBaseInputState).direction || this.renderer!.activeCamera!.unproject(px.x, px.y);
            return direction.scaleTo(distance).addA(this.renderer!.activeCamera!.eye);
        }
    }

    /**
     * Returns geodetic coordinates on the current terrain planet by its screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2 | IBaseInputState} px - Pixel screen 2d coordinates.
     * @returns {LonLat | undefined} -
     */
    public getLonLatFromPixelTerrain(px: Vec2 | IBaseInputState): LonLat | undefined {
        let coords = this.getCartesianFromPixelTerrain(px);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
    }

    /**
     * Project cartesian coordinates to screen space.
     * @public
     * @param {Vec3} coords - Cartesian coordinates.
     * @returns {Vec2} - Screen coordinates.
     */
    public getPixelFromCartesian(coords: Vec3): Vec2 {
        return this.renderer!.activeCamera!.project(coords);
    }

    /**
     * Project geodetic coordinates to screen space.
     * @public
     * @param {LonLat} lonlat - Geodetic coordinates.
     * @returns {Vec2 | undefined} - Screen coordinates.
     */
    public getPixelFromLonLat(lonlat: LonLat): Vec2 | undefined {
        let coords = this.ellipsoid.lonLatToCartesian(lonlat);
        if (coords) {
            return this.renderer!.activeCamera!.project(coords);
        }
    }

    /**
     * Returns distance from an active (screen) camera to the planet ellipsoid.
     * @public
     * @param {Vec2} px - Screen coordinates.
     * @returns {number} -
     */
    public getDistanceFromPixelEllipsoid(px: Vec2 | IBaseInputState): number | undefined {
        let coords = this.getCartesianFromPixelEllipsoid(px);
        if (coords) {
            return coords.distance(this.renderer!.activeCamera!.eye);
        }
    }

    /**
     * Returns distance from active (screen) camera to the planet terrain by screen coordinates.
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {number | undefined} -
     */
    public getDistanceFromPixel(px: Vec2 | IBaseInputState): number {
        if (this.terrain!.isEmpty) {
            return this.getDistanceFromPixelEllipsoid(px) || 0;
        } else {

            let r = this.renderer!;
            let cnv = r.handler!.canvas!;

            let spx = px.x / cnv.width;
            let spy = (cnv.height - px.y) / cnv.height;

            _tempPickingPix_[0] = _tempPickingPix_[1] = _tempPickingPix_[2] = 0.0;

            let dist = 0;

            r.readDistanceColor(spx, spy, _tempPickingPix_);

            dist = decodeFloatFromRGBAArr(_tempPickingPix_);

            if (!(_tempPickingPix_[0] || _tempPickingPix_[1] || _tempPickingPix_[2])) {
                dist = this.getDistanceFromPixelEllipsoid(px) || 0;
            } else if (dist < DEPTH_DISTANCE) {
                r.screenDepthFramebuffer!.activate();

                //if (r.screenDepthFramebuffer.isComplete()) {
                r.screenDepthFramebuffer!.readPixels(_tempDepthColor_, spx, spy);
                let screenPos = new Vec4(spx * 2.0 - 1.0, spy * 2.0 - 1.0, (_tempDepthColor_[0] / 255.0) * 2.0 - 1.0, 1.0 * 2.0 - 1.0);
                let viewPosition = this.camera.frustums[0].inverseProjectionMatrix.mulVec4(screenPos);
                let dir = (px as IBaseInputState).direction || r.activeCamera!.unproject(px.x, px.y);
                dist = -(viewPosition.z / viewPosition.w) / dir.dot(r.activeCamera!.getForward());
                //}

                r.screenDepthFramebuffer!.deactivate();
            }
            return dist;
        }
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     */
    public viewExtent(extent: Extent) {
        if (this.camera) {
            this.camera.viewExtent(extent);
        } else {
            this._initialViewExtent = extent;
        }
    }

    /**
     * Fits camera position for the view extent.
     * @public
     * @param {Array.<number>} extentArr - Geographical extent array, (exactly 4 entries)
     * where index 0 - southwest longitude, 1 - latitude southwest, 2 - longitude northeast, 3 - latitude northeast.
     */
    public viewExtentArr(extentArr: NumberArray4) {
        this.viewExtent(new Extent(new LonLat(extentArr[0], extentArr[1]), new LonLat(extentArr[2], extentArr[3])));
    }

    /**
     * Gets current camera view extent.
     * @public
     * @returns {Extent} -
     */
    public getViewExtent(): Extent {
        return this._viewExtent;
    }

    /**
     * Sets camera to the planet geographical position.
     * @public
     * @param {LonLat} lonlat - Camera position.
     * @param {LonLat} [lookLonLat] - Viewpoint.
     * @param {Vec3} [up] - Camera up vector.
     */
    public viewLonLat(lonlat: LonLat, lookLonLat?: LonLat, up?: Vec3) {
        this.camera.setLonLat(lonlat, lookLonLat, up);
    }

    /**
     * Fly active camera to the view extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     * @param {Number} [height] - Height on the end of the flight route.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {Function} [startCallback] - Callback that calls before the flying begins.
     * @param {Function} [completeCallback] - Callback that calls after flying when flying is finished.
     */
    public flyExtent(
        extent: Extent,
        height?: number,
        up?: Vec3,
        ampl?: number,
        completeCallback?: Function,
        startCallback?: Function
    ) {
        this.camera.flyExtent(extent, height, up, ampl, completeCallback, startCallback);
    }

    /**
     * Fly camera to the point.
     * @public
     * @param {Vec3} cartesian - Point coordinates.
     * @param {Vec3} [look] - Camera "look at" point.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {Function} [completeCallback] - Call the function in the end of flight
     * @param {Function} [startCallback] - Call the function in the beginning
     * @param {Function} [frameCallback] - Each frame callback
     */
    public flyCartesian(
        cartesian: Vec3,
        look?: Vec3 | null,
        up?: Vec3 | null,
        ampl?: number,
        completeCallback?: Function | null,
        startCallback?: Function | null,
        frameCallback?: Function | null
    ) {
        this.camera.flyCartesian(cartesian, look, up, ampl, completeCallback, startCallback, frameCallback);
    }

    /**
     * Fly camera to the geodetic position.
     * @public
     * @param {LonLat} lonlat - Fly geographical coordinates.
     * @param {Vec3 | LonLat} [look] - Camera viewpoint in the end of the flight.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param [completeCallback]
     * @param [startCallback]
     * @param [frameCallback]
     */
    public flyLonLat(
        lonlat: LonLat,
        look?: Vec3 | LonLat,
        up?: Vec3,
        ampl?: number,
        completeCallback?: Function,
        startCallback?: Function,
        frameCallback?: Function
    ) {
        this.camera.flyLonLat(lonlat, look, up, ampl, completeCallback, startCallback, frameCallback);
    }

    /**
     * Stop current flight.
     * @public
     */
    public stopFlying() {
        this.camera.stopFlying();
    }

    public override updateBillboardsTexCoords() {
        for (let i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
        }

        let readyCollections: Record<number, boolean> = {};
        for (let i = 0; i < this._layers.length; i++) {
            let li = this._layers[i];
            if (li instanceof Vector) {
                (li as Vector).each(function (e: Entity) {
                    if (e._entityCollection && !readyCollections[e._entityCollection.id]) {
                        e._entityCollection.billboardHandler.refreshTexCoordsArr();
                        readyCollections[e._entityCollection.id] = true;
                    }
                });
            }
        }
    }

    public getEntityTerrainPoint(entity: Entity, res: Vec3) {
        let n = this._renderedNodes, i = n.length;
        while (i--) {
            if (n[i].segment.isEntityInside(entity)) {
                return n[i].segment.getEntityTerrainPoint(entity, res);
            }
        }
    }

    public async getHeightDefault(lonLat: LonLat): Promise<number> {
        return new Promise<number>((resolve: (alt: number) => void) => {
            if (this.terrain) {
                this.terrain.getHeightAsync(lonLat.clone(), (alt: number) => {
                    resolve(alt);
                });
            } else {
                resolve(0);
            }
        });
    }

    public async getHeightAboveELL(lonLat: LonLat): Promise<number> {
        return new Promise<number>((resolve: (alt: number) => void) => {
            if (this.terrain) {
                this.terrain.getHeightAsync(lonLat.clone(), (alt: number) => {
                    resolve(alt + this.terrain!.geoid.getHeightLonLat(lonLat));
                });
            } else {
                resolve(0);
            }
        });
    }

    public override onremove() {
        this.memClear();
        this.quadTreeStrategy.destroyBranches();
        this._renderedNodes = [];
    }
}

const PLANET_EVENTS: PlanetEventsList = [
    /**
     * Triggered before globe frame begins to render.
     * @event og.scene.Planet#draw
     */
    "draw",

    /**
     * Triggered when layer has added to the planet.
     * @event og.scene.Planet#layeradd
     */
    "layeradd",

    /**
     * Triggered when base layer changed.
     * @event og.scene.Planet#baselayerchange
     */
    "baselayerchange",

    /**
     * Triggered when layer has removed from the planet.
     * @event og.scene.Planet#layerremove
     */
    "layerremove",

    /**
     * Triggered when some layer visibility changed.
     * @event og.scene.Planet#layervisibilitychange
     */
    "layervisibilitychange",

    /**
     * Triggered when all data is loaded
     * @event og.scene.Planet#rendercompleted
     */
    "rendercompleted",

    /**
     * Triggered when all data is loaded
     * @event og.scene.Planet#terraincompleted
     */
    "terraincompleted",

    /**
     * Triggered when layer data is laded
     * @event og.scene.Planet#terraincompleted
     */
    "layerloadend"
];

