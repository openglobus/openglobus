/**
 * @module og/scene/Planet
 */

"use strict";

import * as utils from "../utils/shared.js";
import * as shaders from "../shaders/drawnode.js";
import * as math from "../math.js";
import * as mercator from "../mercator.js";
import * as segmentHelper from "../segment/segmentHelper.js";
import { decodeFloatFromRGBAArr } from "../math/coder.js";
import { Extent } from "../Extent.js";
import { Framebuffer } from "../webgl/Framebuffer.js";
import { GeoImageCreator } from "../utils/GeoImageCreator.js";
import { Quat, Vec3, Vec4 } from "../math/index.js";
import { Vector } from "../layer/Vector.js";
import { Loader } from "../utils/Loader.js";
import { Key, Lock } from "../Lock.js";
import { LonLat } from "../LonLat.js";
import { Node } from "../quadTree/Node.js";
import { NormalMapCreator } from "../utils/NormalMapCreator.js";
import { PlanetCamera } from "../camera/PlanetCamera.js";
import { RenderNode } from "./RenderNode.js";
import { Segment } from "../segment/Segment.js";
import { SegmentLonLat } from "../segment/SegmentLonLat.js";
import { PlainSegmentWorker } from "../utils/PlainSegmentWorker.js";
import { TerrainWorker } from "../utils/TerrainWorker.js";
import { VectorTileCreator } from "../utils/VectorTileCreator.js";
import { wgs84 } from "../ellipsoid/wgs84.js";
import { NIGHT, SPECULAR } from "../res/images.js";
import { Geoid } from "../terrain/Geoid.js";
import { createColorRGB, isUndef } from "../utils/shared.js";
import { MAX_RENDERED_NODES } from "../quadTree/quadTree.js";
import { EarthQuadTreeStrategy } from "../quadTree/EarthQuadTreeStrategy.js";

const CUR_LOD_SIZE = 250; //px
const MIN_LOD_SIZE = 312; //px
const MAX_LOD_SIZE = 190; //px

let _tempPickingPix_ = new Uint8Array(4), _tempDepthColor_ = new Uint8Array(4);

const DEPTH_DISTANCE = 11;//m

/**
 * Maximum created nodes count. The more nodes count the more memory usage.
 * @const
 * @type {number}
 * @default
 */
const MAX_NODES = 200;

const HORIZON_TANGENT = 0.81;

const EVENT_NAMES = [/**
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
    "layerloadend"];

/**
 * Main class for rendering planet
 * @class
 * @extends {RenderNode}
 * @param {string} [options.name="Earth"] - Planet name(Earth by default)
 * @param {Ellipsoid} [options.ellipsoid] - Planet ellipsoid(WGS84 by default)
 * @param {Number} [options.maxGridSize=128] - Segment maximal grid size
 * @param {Number} [options.maxEqualZoomAltitude=15000000.0] - Maximal altitude since segments on the screen bacame the same zoom level
 * @param {Number} [options.minEqualZoomAltitude=10000.0] - Minimal altitude since segments on the screen bacame the same zoom level
 * @param {Number} [options.minEqualZoomCameraSlope=0.8] - Minimal camera slope above te globe where segments on the screen bacame the same zoom level
 * @fires og.scene.Planet#draw
 * @fires og.scene.Planet#layeradd
 * @fires og.scene.Planet#baselayerchange
 * @fires og.scene.Planet#layerremove
 * @fires og.scene.Planet#layervisibilitychange
 * @fires og.scene.Planet#geoimageadd
 */
export class Planet extends RenderNode {
    constructor(options = {}) {
        super(options.name);

        this._cameraFrustums = options.frustums || [[1, 100 + 0.075], [100, 1000 + 0.075], [1000, 1e6 + 10000], [1e6, 1e9]];

        /**
         * @public
         * @type {Ellipsoid}
         */
        this.ellipsoid = options.ellipsoid || wgs84;

        /**
         * @public
         * @type {Boolean}
         */
        this.lightEnabled = true;

        /**
         * Squared ellipsoid radius.
         * @protected
         * @type {number}
         */
        this._planetRadius2 = this.ellipsoid.getPolarSize() * this.ellipsoid.getPolarSize();

        /**
         * Layers array.
         * @protected
         * @type {Array.<Layer>}
         */
        this._layers = [];

        /**
         * Flag to trigger layer update in a next frame
         * @type {boolean}
         * @private
         */
        this._updateLayer = false;

        /**
         * Current visible imagery tile layers array.
         * @public
         * @type {Array.<Layer>}
         */
        this.visibleTileLayers = [];

        /**
         * Current visible vector layers array.
         * @protected
         * @type {Array.<layer.Vector>}
         */
        this.visibleVectorLayers = [];

        this._visibleTileLayerSlices = [];

        /**
         * Vector layers visible nodes with collections.
         * @protected
         * @type {Array.<EntityCollection>}
         */
        this._frustumEntityCollections = [];

        /**
         * There is only one base layer on the globe when layer.isBaseLayer is true.
         * @public
         * @type {Layer}
         */
        this.baseLayer = null;

        /**
         * Terrain provider.
         * @public
         * @type {Terrain}
         */
        this.terrain = null;

        /**
         * Terrain provider Pool.
         * @public
         * @type {Terrain}
         */
        this._terrainPool = null;

        /**
         * Camera is this.renderer.activeCamera pointer.
         * @public
         * @type {PlanetCamera}
         */
        this.camera = null;

        this._minAltitude = options.minAltitude;
        this._maxAltitude = options.maxAltitude;

        this.maxEqualZoomAltitude = options.maxEqualZoomAltitude || 15000000.0;
        this.minEqualZoomAltitude = options.minEqualZoomAltitude || 10000.0;
        this.minEqualZoomCameraSlope = options.minEqualZoomCameraSlope || 0.8;

        /**
         * Screen mouse pointer projected to planet cartesian position.
         * @public
         * @type {Vec3}
         */
        this.mousePositionOnEarth = new Vec3();

        this.emptyTexture = null;
        this.transparentTexture = null;
        this.defaultTexture = null;

        /**
         * Current visible minimal zoom index planet segment.
         * @public
         * @type {number}
         */
        this.minCurrZoom = math.MAX;

        /**
         * Current visible maximal zoom index planet segment.
         * @public
         * @type {number}
         */
        this.maxCurrZoom = math.MIN;

        this._viewExtent = new Extent(new LonLat(180, 180), new LonLat(-180, -180));

        /**
         * @protected
         */
        this._createdNodesCount = 0;

        /**
         * Planet's segments collected for rendering frame.
         * @protected
         * @type {quadTree.Node}
         */
        this._renderedNodes = [];
        this._renderedNodesInFrustum = [];

        /**
         * Current visible mercator segments tree nodes array.
         * @protected
         * @type {quadTree.Node}
         */
        this._visibleNodes = {};

        /**
         * Current visible north pole nodes tree nodes array.
         * @protected
         * @type {quadTree.Node}
         */
        this._visibleNodesNorth = {};

        /**
         * Current visible south pole nodes tree nodes array.
         * @protected
         * @type {quadTree.Node}
         */
        this._visibleNodesSouth = {};

        /**
         * Layers activity lock.
         * @public
         * @type {idle.Lock}
         */
        this.layerLock = new Lock();

        /**
         * Terrain providers activity lock.
         * @public
         * @type {idle.Lock}
         */
        this.terrainLock = new Lock();

        /**
         * Layer's transparent colors.
         * @protected
         */
        this._tcolorArr = [];

        /**
         * Height scale factor. 1 - is normal elevation scale.
         * @protected
         * @type {number}
         */
        this._heightFactor = 1.0;

        /**
         * Precomputed indexes array for differrent grid size segments.
         * @protected
         * @type {Array.<Array.<number>>}
         */
        this._indexesCache = [];
        this._indexesCacheToRemove = [];
        this._indexesCacheToRemoveCounter = 0;

        /**
         * Precomputed texture coordinates buffers for differrent grid size segments.
         * @protected
         * @type {Array.<Array.<number>>}
         */
        this._textureCoordsBufferCache = [];

        /**
         * Framebuffer for relief. Is null when WEBGL_draw_buffers extension initialized.
         * @protected
         * @type {Object}
         */
        this._heightPickingFramebuffer = null;

        this.quadTreeStrategy = options.quadTreeStrategyPrototype ? new options.quadTreeStrategyPrototype({ planet: this }) : new EarthQuadTreeStrategy({ planet: this });

        /**
         * Night glowing gl texture.
         * @protected
         */
        this._nightTexture = null;

        /**
         * Specular mask gl texture.
         * @protected
         */
        this._specularTexture = null;

        //TODO: replace to a function
        let a = utils.createColorRGB(options.ambient, new Vec3(0.2, 0.2, 0.2));
        let d = utils.createColorRGB(options.diffuse, new Vec3(0.8, 0.8, 0.8));
        let s = utils.createColorRGB(options.specular, new Vec3(0.0003, 0.0003, 0.0003));
        let shininess = options.shininess || 20.0;

        this._ambient = new Float32Array([a.x, a.y, a.z]);
        this._diffuse = new Float32Array([d.x, d.y, d.z]);
        this._specular = new Float32Array([s.x, s.y, s.z, shininess]);

        /**
         * True for rendering night glowing texture.
         * @protected
         * @type {boolean}
         */
        this._useNightTexture = isUndef(options.useNightTexture) ? true : options.useNightTexture;

        /**
         * True for rendering specular mask texture.
         * @protected
         * @type {boolean}
         */
        this._useSpecularTexture = isUndef(options.useSpecularTexture) ? true : options.useSpecularTexture;

        this._maxGridSize = Math.log2(options.maxGridSize || 128);

        /**
         * Segment multiple textures size.(4 - convinient value for the most devices)
         * @const
         * @public
         */
        this.SLICE_SIZE = 4;
        this.SLICE_SIZE_4 = this.SLICE_SIZE * 4;
        this.SLICE_SIZE_3 = this.SLICE_SIZE * 3;

        /**
         * Level of the visible segment detalization.
         * @public
         * @type {number}
         */
        this._lodSize = CUR_LOD_SIZE;
        this._curLodSize = CUR_LOD_SIZE;
        this._minLodSize = MIN_LOD_SIZE;
        this._maxLodSize = MAX_LOD_SIZE;

        this._pickingColorArr = new Float32Array(this.SLICE_SIZE_4);
        this._samplerArr = new Int32Array(this.SLICE_SIZE);
        this._pickingMaskArr = new Int32Array(this.SLICE_SIZE);

        /**
         * GeoImage creator.
         * @protected
         * @type{utils.GeoImageCreator}
         */
        this._geoImageCreator = null;

        this._vectorTileCreator = null;

        this._normalMapCreator = null;

        this._terrainWorker = new TerrainWorker(3);

        this._plainSegmentWorker = new PlainSegmentWorker(3);

        this._tileLoader = new Loader(options.maxLoadingRequests || 12);

        this._memKey = new Key();

        this.events.registerNames(EVENT_NAMES);

        this._distBeforeMemClear = 0.0;

        this._prevCamEye = new Vec3();

        this._initialized = false;

        this.always = [];

        this._renderCompleted = false;
        this._renderCompletedActivated = false;

        this._terrainCompleted = false;
        this._terrainCompletedActivated = false;

        this._collectRenderNodesIsActive = true;

        this._skipPreRender = false;
    }

    static getBearingNorthRotationQuat(cartesian) {
        let n = cartesian.normal();
        let t = Vec3.proj_b_to_plane(Vec3.UNIT_Y, n);
        return Quat.getLookRotation(t, n);
    }

    set diffuse(rgb) {
        let vec = createColorRGB(rgb);
        this._diffuse = new Float32Array(vec.toArray());
    }

    set ambient(rgb) {
        let vec = createColorRGB(rgb);
        this._ambient = new Float32Array(vec.toArray());
    }

    set specular(rgb) {
        let vec = createColorRGB(rgb);
        this._specular = new Float32Array([vec.x, vec.y, vec.y, this._specular[3]]);
    }

    set shininess(v) {
        this._specular[3] = v;
    }

    get normalMapCreator() {
        return this._normalMapCreator;
    }

    get layers() {
        return [...this._layers];
    }

    /**
     * Add the given control to the renderer of the planet scene.
     * @param {control.Control} control - Control.
     */
    addControl(control) {
        control.planet = this;
        control.addTo(this.renderer);
    }

    get lodSize() {
        return this._lodSize;
    }

    setLodSize(currentLodSize, minLodSize, maxLodSize) {
        this._maxLodSize = maxLodSize || this._maxLodSize;
        this._minLodSize = minLodSize || this._minLodSize;
        this._curLodSize = currentLodSize || this._curLodSize;
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;
    }

    /**
     * Add the given controls array to the renderer of the planet.
     * @param {Array.<control.Control>} cArr - Control array.
     */
    addControls(cArr) {
        for (var i = 0; i < cArr.length; i++) {
            this.addControl(cArr[i]);
        }
    }

    /**
     * Return layer by it name
     * @param {string} name - Name of the layer. og.Layer.prototype.name
     * @public
     * @returns {Layer} -
     */
    getLayerByName(name) {
        for (let i = 0, len = this._layers.length; i < len; i++) {
            if (name === this._layers[i].name) {
                return this._layers[i];
            }
        }
    }

    /**
     * Adds the given layer to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    addLayer(layer) {
        layer.addTo(this);
    }

    /**
     * Dispatch layer visibility changing event.
     * @param {Layer} layer - Changed layer.
     * @protected
     */
    _onLayerVisibilityChanged(layer) {
        this.events.dispatch(this.events.layervisibilitychange, layer);
    }

    /**
     * Adds the given layers array to the planet.
     * @param {Array.<Layer>} layers - Layers array.
     * @public
     */
    addLayers(layers) {
        for (let i = 0, len = layers.length; i < len; i++) {
            this.addLayer(layers[i]);
        }
    }

    /**
     * Removes the given layer from the planet.
     * @param {Layer} layer - Layer to remove.
     * @return {Layer|undefined} The removed layer or undefined if the layer was not found.
     * @public
     */
    removeLayer(layer) {
        return layer.remove();
    }

    /**
     *
     * @protected
     * @param {Layer} layer - Material layer.
     */
    _clearLayerMaterial(layer) {
        this.quadTreeStrategy.clearLayerMaterial(layer);
    }


    /**
     * Get the collection of layers associated with this planet.
     * @return {Array.<Layer>} Layers array.
     * @public
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Sets base layer coverage to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    setBaseLayer(layer) {
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
    setHeightFactor(factor) {
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;

        if (this._heightFactor !== factor) {
            this._heightFactor = factor;
            this.quadTreeStrategy.destroyBranches();
        }
    }

    /**
     * Gets elevation scale.
     * @returns {number} Terrain elevation scale
     */
    getHeightFactor() {
        return this._heightFactor;
    }

    /**
     * Sets terrain provider
     * @public
     * @param {Terrain} terrain - Terrain provider.
     */
    setTerrain(terrain) {
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
            Geoid.loadModel(terrain._geoid.src)
                .then((m) => {
                    terrain.getGeoid().setModel(m);
                    this._plainSegmentWorker.setGeoid(terrain.getGeoid());
                    terrain._isReady = true;
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }

    /**
     * @virtual
     * @protected
     */
    _initializeShaders() {
        var h = this.renderer.handler;

        h.addProgram(shaders.drawnode_screen_nl(), true);
        if (h.isWebGl2()) {
            h.addProgram(shaders.drawnode_screen_wl_webgl2(), true);
        } else {
            h.addProgram(shaders.drawnode_screen_wl(), true);
        }
        h.addProgram(shaders.drawnode_colorPicking(), true);
        h.addProgram(shaders.drawnode_depth(), true);
        h.addProgram(shaders.drawnode_heightPicking(), true);

        this.renderer.addPickingCallback(this, this._renderColorPickingFramebufferPASS);

        this.renderer.addDepthCallback(this, this._renderDepthFramebufferPASS);

        this._heightPickingFramebuffer = new Framebuffer(this.renderer.handler, {
            width: 320, height: 240
        });

        this._heightPickingFramebuffer.init();

        this.renderer.screenTexture.height = this._heightPickingFramebuffer.textures[0];
    }

    _onLayerLoadend(layer) {
        this.events.dispatch(this.events.layerloadend, layer);
    }

    /**
     * @virtual
     * @public
     */
    init() {

        this._tileLoader.events.on("layerloadend", this._onLayerLoadend, this);

        // Initialization indexes table
        segmentHelper.getInstance().setMaxGridSize(this._maxGridSize);
        const TABLESIZE = this._maxGridSize;
        let kk = 0;
        // Initialization indexes buffers cache. It takes about 120mb RAM!
        for (var i = 0; i <= TABLESIZE; i++) {
            !this._indexesCache[i] && (this._indexesCache[i] = new Array(TABLESIZE));
            for (var j = 0; j <= TABLESIZE; j++) {
                !this._indexesCache[i][j] && (this._indexesCache[i][j] = new Array(TABLESIZE));
                for (var k = 0; k <= TABLESIZE; k++) {
                    !this._indexesCache[i][j][k] && (this._indexesCache[i][j][k] = new Array(TABLESIZE));
                    for (var m = 0; m <= TABLESIZE; m++) {
                        !this._indexesCache[i][j][k][m] && (this._indexesCache[i][j][k][m] = new Array(TABLESIZE));
                        for (var q = 0; q <= TABLESIZE; q++) {
                            let ptr = {
                                buffer: null
                            };

                            if (i >= 1 && i === j && i === k && i === m && i === q) {
                                let indexes = segmentHelper
                                    .getInstance()
                                    .createSegmentIndexes(i, [j, k, m, q]);
                                ptr.buffer = this.renderer.handler.createElementArrayBuffer(indexes, 1);
                                indexes = null;
                            } else {
                                this._indexesCacheToRemove[kk++] = ptr;
                            }

                            this._indexesCache[i][j][k][m][q] = ptr;
                        }
                    }
                }
            }
        }

        this.renderer.events.on("resize", () => {
            this._renderCompletedActivated = false;
            this._terrainCompletedActivated = false;
        });

        this.renderer.events.on("resizeend", () => {
            this._renderCompletedActivated = false;
            this._terrainCompletedActivated = false;
        });

        // Initialize texture coordinates buffer pool
        this._textureCoordsBufferCache = [];

        let texCoordCache = segmentHelper.getInstance().initTextureCoordsTable(TABLESIZE + 1);

        for (let i = 0; i <= TABLESIZE; i++) {
            this._textureCoordsBufferCache[i] = this.renderer.handler.createArrayBuffer(texCoordCache[i], 2, ((1 << i) + 1) * ((1 << i) + 1));
        }

        texCoordCache = null;

        // creating empty textures
        var that = this;
        this.renderer.handler.createDefaultTexture(null, function (t) {
            that.solidTextureOne = t;
            that.solidTextureTwo = t;
        });

        this.transparentTexture = this.renderer.handler.transparentTexture;

        this.camera = this.renderer.activeCamera = new PlanetCamera(this, {
            frustums: this._cameraFrustums,
            eye: new Vec3(0, 0, 28000000),
            look: new Vec3(0, 0, 0),
            up: new Vec3(0, 1, 0),
            minAltitude: this._minAltitude,
            maxAltitude: this._maxAltitude
        });

        this.camera.update();

        this._renderedNodesInFrustum = new Array(this.camera.frustums.length);
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i] = [];
        }


        // Creating quad trees nodes
        this.quadTreeStrategy.init();

        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

        // Applying shaders
        this._initializeShaders();

        this._updateVisibleLayers();

        this.renderer.addPickingCallback(this, this._frustumEntityCollectionPickingCallback);

        // loading Earth night glowing texture
        if (this._useNightTexture) {
            createImageBitmap(NIGHT).then((e) => (this._nightTexture = this.renderer.handler.createTextureDefault(e)));
        }

        // load water specular mask
        if (this._useSpecularTexture) {
            createImageBitmap(SPECULAR).then((e) => (this._specularTexture = this.renderer.handler.createTexture_l(e)));
        }

        this._geoImageCreator = new GeoImageCreator(this);

        this._vectorTileCreator = new VectorTileCreator(this);

        this._normalMapCreator = new NormalMapCreator(this, {
            minTableSize: 1,
            maxTableSize: TABLESIZE,
            blur: this.terrain && (this.terrain.blur != undefined ? this.terrain.blur : true)
        });

        this.renderer.events.on("draw", this._globalPreDraw, this, -100);

        // Loading first nodes for better viewing if you have started on a lower altitude.
        this._preRender();

        this._initialized = true;

        this.renderer.events.on("postdraw", () => {
            this._checkRendercompleted();
        });
    }

    clearIndexesCache() {
        this._indexesCacheToRemoveCounter = 0;
        let c = this._indexesCacheToRemove, gl = this.renderer.handler.gl;
        for (let i = 0, len = c.length; i < len; i++) {
            let ci = c[i];
            gl.deleteBuffer(ci.buffer);
            ci.buffer = null;
        }
    }

    _preRender() {
        this.quadTreeStrategy.preRender();

        this._preLoad();
    }

    _preLoad() {
        this._clearRenderedNodeList();

        this._skipPreRender = false;

        this.quadTreeStrategy.preLoad();
    }

    /**
     * Creates default textures first for nirth pole and whole globe and second for south pole.
     * @public
     * @param{Object} param0 -
     * @param{Object} param1 -
     */
    createDefaultTextures(param0, param1) {
        this.renderer.handler.gl.deleteTexture(this.solidTextureOne);
        this.renderer.handler.gl.deleteTexture(this.solidTextureTwo);
        var that = this;
        this.renderer.handler.createDefaultTexture(param0, function (t) {
            that.solidTextureOne = t;
        });
        this.renderer.handler.createDefaultTexture(param1, function (t) {
            that.solidTextureTwo = t;
        });
    }

    /**
     * Updates attribution lists
     * @public
     */
    updateAttributionsList() {
        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li._visibility) {
                if (li._attribution.length) {
                    html += "<li>" + li._attribution + "</li>";
                }
            }
        }

        this._applyAttribution(html)
    }

    updateVisibleLayers() {
        this._updateLayer = true;
    }

    /**
     * Updates visible layers.
     * @public
     */
    _updateVisibleLayers() {
        this.visibleTileLayers = [];
        this.visibleTileLayers.length = 0;

        this.visibleVectorLayers = [];
        this.visibleVectorLayers.length = 0;

        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li._visibility) {
                if (li._isBaseLayer) {
                    this.createDefaultTextures(li._defaultTextures[0], li._defaultTextures[1]);
                    this.baseLayer = li;
                }

                if (li.hasImageryTiles()) {
                    this.visibleTileLayers.push(li);
                }

                if (li.isVector) {
                    this.visibleVectorLayers.push(li);
                }

                if (li._attribution.length) {
                    html += "<li>" + li._attribution + "</li>";
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
     * @private
     */
    _applyAttribution(html) {
        if (this.renderer) {
            if (html.length) {
                html = "<ul>" + html + "</ul>";
                if (this.renderer.div.attributions.innerHTML !== html) {
                    this.renderer.div.attributions.style.display = "block";
                    this.renderer.div.attributions.innerHTML = html;
                }
            } else {
                this.renderer.div.attributions.style.display = "none";
                this.renderer.div.attributions.innerHTML = "";
            }
        }
    }

    /**
     * Sort visible layer - preparing for rendering.
     * @protected
     */
    _sortLayers() {
        this.visibleVectorLayers.sort((a, b) => (a._zIndex - b._zIndex) || (a._height - b._height));

        this._visibleTileLayerSlices = [];
        this._visibleTileLayerSlices.length = 0;

        if (this.visibleTileLayers.length) {
            this.visibleTileLayers.sort((a, b) => (a._height - b._height) || (a._zIndex - b._zIndex));

            var k = -1;
            var currHeight = this.visibleTileLayers[0]._height;
            for (let i = 0, len = this.visibleTileLayers.length; i < len; i++) {
                if (i % this.SLICE_SIZE === 0 || this.visibleTileLayers[i]._height !== currHeight) {
                    k++;
                    this._visibleTileLayerSlices[k] = [];
                    currHeight = this.visibleTileLayers[i]._height;
                }
                this._visibleTileLayerSlices[k].push(this.visibleTileLayers[i]);
            }
        }
    }

    _clearRenderedNodeList() {
        // clearing all node list
        this._renderedNodes.length = 0;
        this._renderedNodes = [];
    }

    _clearRenderNodesInFrustum() {
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i].length = 0;
            this._renderedNodesInFrustum[i] = [];
        }
    }

    /**
     * Collects visible quad nodes.
     * @protected
     */
    _collectRenderNodes() {
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

            let temp = this._renderedNodes,
                rf = this._renderedNodesInFrustum,
                temp2 = [];

            this._clearRenderNodesInFrustum();

            for (var i = 0, len = temp.length; i < len; i++) {
                var ri = temp[i];
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

    _globalPreDraw() {
        let cam = this.camera;

        this._distBeforeMemClear += this._prevCamEye.distance(cam.eye);
        this._prevCamEye.copy(cam.eye);
        cam.checkFly();

        // free memory
        if (this._createdNodesCount > MAX_NODES && this._distBeforeMemClear > 1000.0) {
            this.terrain.clearCache();
            this.memClear();
        }

        if (this._indexesCacheToRemoveCounter > 600) {
            this.clearIndexesCache();
        }
    }

    /**
     * Render node callback.
     * @public
     */
    frame() {

        if (this._updateLayer) {
            this._updateLayer = false;
            this._updateVisibleLayers();
        }

        this._renderScreenNodesPASS();

        this._renderHeightPickingFramebufferPASS();

        this.drawEntityCollections(this._frustumEntityCollections);
    }

    _checkRendercompleted() {
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

    lockQuadTree() {
        this._collectRenderNodesIsActive = false;
        this.camera.setTerrainCollisionActivity(false);
    }

    unlockQuadTree() {
        this._collectRenderNodesIsActive = true;
        this.camera.setTerrainCollisionActivity(true);
    }

    /**
     * @protected
     */
    _renderScreenNodesPASS() {

        let sh, shu;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;
        let cam = renderer.activeCamera;
        let frustumIndex = cam.getCurrentFrustum(), firstPass = frustumIndex === cam.FARTHEST_FRUSTUM_INDEX;

        if (firstPass) {
            if (this._skipPreRender && this._collectRenderNodesIsActive) {
                this._collectRenderNodes();
            }
            this._skipPreRender = true;

            // Here is the planet node dispatches a draw event before
            // rendering begins and we have got render nodes.
            this.events.dispatch(this.events.draw, this);

            this.transformLights();

            this._normalMapCreator.frame();

            // Creating geoImages textures.
            this._geoImageCreator.frame();

            // Collect entity collections from vector layers
            this._collectVectorLayerCollections();

            // Vector tiles rasteriazation
            this._vectorTileCreator.frame();
        }


        gl.enable(gl.CULL_FACE);

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        if (this.lightEnabled) {
            h.programs.drawnode_screen_wl.activate();
            sh = h.programs.drawnode_screen_wl._program;
            shu = sh.uniforms;

            gl.uniform4fv(shu.lightsPositions, this._lightsTransformedPositions);

            gl.uniformMatrix3fv(shu.normalMatrix, false, cam.getNormalMatrix());
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

            if (this.baseLayer) {
                gl.uniform3fv(shu.diffuse, this.baseLayer._diffuse || this._diffuse);
                gl.uniform3fv(shu.ambient, this.baseLayer._ambient || this._ambient);
                gl.uniform4fv(shu.specular, this.baseLayer._specular || this._specular);
            } else {
                gl.uniform3fv(shu.diffuse, this._diffuse);
                gl.uniform3fv(shu.ambient, this._ambient);
                gl.uniform4fv(shu.specular, this._specular);
            }

            // bind night glowing material
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, (this.camera._lonLat.height > 329958.0 && (this._nightTexture || this.transparentTexture)) || this.transparentTexture);
            gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

            // bind specular material
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
            gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
            gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

        } else {
            h.programs.drawnode_screen_nl.activate();
            sh = h.programs.drawnode_screen_nl._program;
            shu = sh.uniforms;
            gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        }

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        // drawing planet nodes
        var rn = this._renderedNodesInFrustum[frustumIndex], sl = this._visibleTileLayerSlices;

        if (sl.length) {
            let sli = sl[0];
            for (var i = sli.length - 1; i >= 0; --i) {
                let li = sli[i];
                if (li._fading && firstPass && li._refreshFadingOpacity()) {
                    sli.splice(i, 1);
                }
            }
        }

        let isEq = this.terrain.equalizeVertices;
        i = rn.length;
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

        gl.disable(gl.BLEND);
    }

    /**
     * @protected
     */
    _renderHeightPickingFramebufferPASS() {
        if (!this.terrain.isEmpty) {

            this._heightPickingFramebuffer.activate();

            let sh;
            let renderer = this.renderer;
            let h = renderer.handler;
            let gl = h.gl;
            let cam = renderer.activeCamera;
            let frustumIndex = cam.getCurrentFrustum();

            if (frustumIndex === cam.FARTHEST_FRUSTUM_INDEX) {
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            } else {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }

            h.programs.drawnode_heightPicking.activate();
            sh = h.programs.drawnode_heightPicking._program;
            let shu = sh.uniforms;

            gl.uniformMatrix4fv(shu.viewMatrix, false, renderer.activeCamera.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, renderer.activeCamera.getProjectionMatrix());

            gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

            // drawing planet nodes
            let rn = this._renderedNodesInFrustum[frustumIndex], sl = this._visibleTileLayerSlices;

            let i = rn.length;
            while (i--) {
                rn[i].segment.heightPickingRendering(sh, sl[0]);
            }

            this._heightPickingFramebuffer.deactivate();
        }
    }

    /**
     * @protected
     */
    _renderColorPickingFramebufferPASS() {
        let sh;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;
        h.programs.drawnode_colorPicking.activate();
        sh = h.programs.drawnode_colorPicking._program;
        let shu = sh.uniforms;
        let cam = renderer.activeCamera;

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        // drawing planet nodes
        var rn = this._renderedNodesInFrustum[cam.getCurrentFrustum()], sl = this._visibleTileLayerSlices;

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

        gl.disable(gl.BLEND);
    }

    /**
     * @protected
     */
    _renderDepthFramebufferPASS() {
        let sh;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;
        h.programs.drawnode_depth.activate();
        sh = h.programs.drawnode_depth._program;
        let shu = sh.uniforms;
        let cam = renderer.activeCamera;

        gl.disable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());

        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        gl.uniform3fv(shu.frustumPickingColor, cam.frustum._pickingColorU);

        // drawing planet nodes
        var rn = this._renderedNodesInFrustum[cam.getCurrentFrustum()], sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            rn[i].segment.depthRendering(sh, sl[0]);
        }
    }

    _collectVectorLayerCollections() {
        this._frustumEntityCollections.length = 0;
        this._frustumEntityCollections = [];

        let i = this.visibleVectorLayers.length;
        while (i--) {
            let vi = this.visibleVectorLayers[i];

            if (vi._fading && vi._refreshFadingOpacity()) {
                this.visibleVectorLayers.splice(i, 1);
            }

            vi.collectVisibleCollections(this._frustumEntityCollections);
            vi.update();
        }
    }

    /**
     * Vector layers picking pass.
     * @protected
     */
    _frustumEntityCollectionPickingCallback() {
        this.drawPickingEntityCollections(this._frustumEntityCollections);
    }

    /**
     * Starts clear memory thread.
     * @public
     */
    memClear() {
        this._distBeforeMemClear = 0;

        this.camera._insideSegment = null;

        this.layerLock.lock(this._memKey);
        this.terrainLock.lock(this._memKey);
        this._normalMapCreator.lock(this._memKey);

        this._normalMapCreator.clear();
        this.terrain.abortLoading();
        this._tileLoader.abortAll();


        this.quadTreeStrategy.clear();
        this.layerLock.free(this._memKey);
        this.terrainLock.free(this._memKey);
        this._normalMapCreator.free(this._memKey);

        this._createdNodesCount = 0;
    }

    /**
     * Returns ray vector hit ellipsoid coordinates.
     * If the ray doesn't hit ellipsoit returns null.
     * @public
     * @param {Ray} ray - Ray 3d.
     * @returns {Vec3} -
     */
    getRayIntersectionEllipsoid(ray) {
        return this.ellipsoid.hitRay(ray.origin, ray.direction);
    }

    /**
     * Returns 2d screen coordanates projection point to the planet ellipsoid 3d coordinates.
     * @public
     * @param {math.Pixel} px - 2D sreen coordinates.
     * @returns {Vec3} -
     */
    getCartesianFromPixelEllipsoid(px) {
        var cam = this.renderer.activeCamera;
        return this.ellipsoid.hitRay(cam.eye, cam.unproject(px.x, px.y));
    }

    /**
     * Returns 2d screen coordanates projection point to the planet ellipsoid geographical coordinates.
     * @public
     * @param {math.Pixel} px - 2D screen coordinates.
     * @returns {LonLat} -
     */
    getLonLatFromPixelEllipsoid(px) {
        var coords = this.getCartesianFromPixelEllipsoid(px);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
        return null;
    }

    /**
     * Returns 3d cartesian coordinates on the relief planet by mouse cursor
     * position or null if mouse cursor is outside the planet.
     * @public
     * @returns {Vec3} -
     */
    getCartesianFromMouseTerrain() {
        var ms = this.renderer.events.mouseState;
        var distance = this.getDistanceFromPixel(ms);
        if (distance) {
            return ms.direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
        }
        return null;
    }

    /**
     * Returns 3d cartesian coordinates on the relief planet by 2d screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2} px - Pixel screen 2d coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {Vec3} -
     */
    getCartesianFromPixelTerrain(px) {
        var distance = this.getDistanceFromPixel(px);
        if (distance) {
            var direction = px.direction || this.renderer.activeCamera.unproject(px.x, px.y);
            return direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
        }
        return null;
    }

    /**
     * Returns geographical coordinates on the relief planet by 2d screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2} px - Pixel screen 2d coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {LonLat} -
     */
    getLonLatFromPixelTerrain(px, force) {
        var coords = this.getCartesianFromPixelTerrain(px, force);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
        return null;
    }

    /**
     * Returns projected 2d screen coordinates by 3d cartesian coordiantes.
     * @public
     * @param {Vec3} coords - Cartesian coordinates.
     * @returns {Vec2} -
     */
    getPixelFromCartesian(coords) {
        return this.renderer.activeCamera.project(coords);
    }

    /**
     * Returns projected 2d screen coordinates by geographical coordinates.
     * @public
     * @param {LonLat} lonlat - Geographical coordinates.
     * @returns {Vec2} -
     */
    getPixelFromLonLat(lonlat) {
        var coords = this.ellipsoid.lonLatToCartesian(lonlat);
        if (coords) {
            return this.renderer.activeCamera.project(coords);
        }
        return null;
    }

    /**
     * Returns distance from active camera to the the planet ellipsoid
     * coordiantes unprojected by 2d screen coordiantes, or null if screen coordinates outside the planet.
     * @public
     * @param {Vec2} px - Screen coordinates.
     * @returns {number} -
     */
    getDistanceFromPixelEllipsoid(px) {
        var coords = this.getCartesianFromPixelEllipsoid(px);
        return coords ? coords.distance(this.renderer.activeCamera.eye) : null;
    }

    /**
     * Returns distance from active camera to the the relief planet coordiantes unprojected
     * by 2d screen coordiantes, or null if screen coordinates outside the planet.
     * If screen coordinates inside the planet but relief is not exists in the
     * point than function returns distance to the planet ellipsoid.
     * @public
     * @param {Vec2} px - Screen coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {number} -
     */
    getDistanceFromPixel(px) {
        if (this.terrain.isEmpty) {
            return this.getDistanceFromPixelEllipsoid(px) || 0;
        } else {

            let r = this.renderer, cnv = this.renderer.handler.canvas;

            let spx = px.x / cnv.width, spy = (cnv.height - px.y) / cnv.height;

            _tempPickingPix_[0] = _tempPickingPix_[1] = _tempPickingPix_[2] = 0.0;

            let dist = 0;

            // HEIGHT
            this._heightPickingFramebuffer.activate();
            if (this._heightPickingFramebuffer.isComplete()) {
                this._heightPickingFramebuffer.readPixels(_tempPickingPix_, spx, spy);
                dist = decodeFloatFromRGBAArr(_tempPickingPix_);
            }
            this._heightPickingFramebuffer.deactivate();

            if (!(_tempPickingPix_[0] || _tempPickingPix_[1] || _tempPickingPix_[2])) {
                dist = this.getDistanceFromPixelEllipsoid(px) || 0;
            } else if (dist < DEPTH_DISTANCE) {
                r.screenDepthFramebuffer.activate();
                if (r.screenDepthFramebuffer.isComplete()) {
                    r.screenDepthFramebuffer.readPixels(_tempDepthColor_, spx, spy);
                    let screenPos = new Vec4(spx * 2.0 - 1.0, spy * 2.0 - 1.0, (_tempDepthColor_[0] / 255.0) * 2.0 - 1.0, 1.0 * 2.0 - 1.0);
                    let viewPosition = this.camera.frustums[0]._inverseProjectionMatrix.mulVec4(screenPos);
                    let dir = px.direction || this.renderer.activeCamera.unproject(px.x, px.y);
                    dist = -(viewPosition.z / viewPosition.w) / dir.dot(this.renderer.activeCamera.getForward());
                }
                r.screenDepthFramebuffer.deactivate();
            }
            return dist;
        }
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     */
    viewExtent(extent) {
        this.renderer.activeCamera.viewExtent(extent);
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {Array.<number>} extentArr - Geographical extent array, (exactly 4 entries)
     * where index 0 - southwest longitude, 1 - latitude southwest, 2 - longitude northeast, 3 - latitude northeast.
     */
    viewExtentArr(extentArr) {
        this.renderer.activeCamera.viewExtent(new Extent(new LonLat(extentArr[0], extentArr[1]), new LonLat(extentArr[2], extentArr[3])));
    }

    /**
     * Gets current viewing geographical extent.
     * @public
     * @returns {Extent} -
     */
    getViewExtent() {
        return this._viewExtent;
        // if (this._viewExtentMerc) {
        //     var ne = this._viewExtentMerc.northEast.inverseMercator(),
        //         sw = this._viewExtentMerc.southWest.inverseMercator();
        //     if (this._viewExtentWGS84) {
        //         var e = this._viewExtentWGS84;
        //         if (e.northEast.lon > ne.lon) {
        //             ne.lon = e.northEast.lon;
        //         }
        //         if (e.northEast.lat > ne.lat) {
        //             ne.lat = e.northEast.lat;
        //         }
        //         if (e.southWest.lon < sw.lon) {
        //             sw.lon = e.southWest.lon;
        //         }
        //         if (e.southWest.lat < sw.lat) {
        //             sw.lat = e.southWest.lat;
        //         }
        //     }
        //     return new Extent(sw, ne);
        // } else if (this._viewExtentWGS84) {
        //     return this._viewExtentWGS84;
        // }
    }

    /**
     * Sets camera to the planet geographical position.
     * @public
     * @param {LonLat} lonlat - New geographical position.
     * @param {Vec3} [up] - Camera UP vector.
     */
    viewLonLat(lonlat, up) {
        this.renderer.activeCamera.setLonLat(lonlat, up);
    }

    /**
     * Fly camera to the planet geographical extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     * @param {Number} [height] - Height on the end of the flight route.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {cameraCallback} [startCallback] - Callback that calls after flying when flying is finished.
     * @param {cameraCallback} [completeCallback] - Callback that calls befor the flying begins.
     */
    flyExtent(extent, height, up, ampl, completeCallback, startCallback) {
        this.renderer.activeCamera.flyExtent(extent, height, up, ampl, completeCallback, startCallback);
    }

    /**
     * Fly camera to the new point.
     * @public
     * @param {Vec3} cartesian - Fly coordiantes.
     * @param {Vec3} [look] - Camera "look at" point.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param [completeCallback]
     * @param [startCallback]
     * @param [frameCallback]
     */
    flyCartesian(cartesian, look, up, ampl, completeCallback, startCallback, frameCallback) {
        this.renderer.activeCamera.flyCartesian(cartesian, look, up, ampl, completeCallback, startCallback, frameCallback);
    }

    /**
     * Fly camera to the new geographical position.
     * @public
     * @param {LonLat} lonlat - Fly geographical coordiantes.
     * @param {Vec3} [look] - Camera "look at" point on the end of a flying.
     * @param {Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param [completeCallback]
     * @param [startCallback]
     * @param [frameCallback]
     */
    flyLonLat(lonlat, look, up, ampl, completeCallback, startCallback, frameCallback) {
        this.renderer.activeCamera.flyLonLat(lonlat, look, up, ampl, completeCallback, startCallback, frameCallback);
    }

    /**
     * Breaks the flight.
     * @public
     */
    stopFlying() {
        this.renderer.activeCamera.stopFlying();
    }

    updateBillboardsTexCoords() {
        for (let i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
        }

        let readyCollections = {};
        for (let i = 0; i < this._layers.length; i++) {
            let li = this._layers[i];
            if (li instanceof Vector) {
                li.each(function (e) {
                    if (e._entityCollection && !readyCollections[e._entityCollection.id]) {
                        e._entityCollection.billboardHandler.refreshTexCoordsArr();
                        readyCollections[e._entityCollection.id] = true;
                    }
                });
            }
        }
    }

    getEntityTerrainPoint(entity, res) {
        let n = this._renderedNodes, i = n.length;
        while (i--) {
            if (n[i].segment.isEntityInside(entity)) {
                return n[i].segment.getEntityTerrainPoint(entity, res);
            }
        }
    }

    async getHeightDefault(lonLat) {
        return new Promise((resolve, reject) => {
            this.terrain.getHeightAsync(lonLat.clone(), (alt) => {
                resolve(alt);
            });
        });
    }

    async getHeightAboveELL(lonLat) {
        return new Promise((resolve, reject) => {
            this.terrain.getHeightAsync(lonLat.clone(), (alt) => {
                resolve(alt + this.terrain.geoid.getHeightLonLat(lonLat));
            });
        });
    }
}
