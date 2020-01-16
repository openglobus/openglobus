/**
 * @module og/scene/Planet
 */

'use strict';

import * as coder from '../math/coder.js';
import * as shaders from '../shaders/drawnode.js';
import * as math from '../math.js';
import * as mercator from '../mercator.js';
import * as segmentHelper from '../segment/segmentHelper.js';
import * as quadTree from '../quadTree/quadTree.js';
import { MAX_RENDERED_NODES } from '../quadTree/quadTree.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { EPSG4326 } from '../proj/EPSG4326.js';
import { Extent } from '../Extent.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { GeoImageCreator } from '../utils/GeoImageCreator.js';
import { Vec3 } from '../math/Vec3.js';
import { Vec4 } from '../math/Vec4.js';
import { Vector } from '../layer/Vector.js';
import { Loader } from '../utils/Loader.js';
import { Lock, Key } from '../Lock.js';
import { LonLat } from '../LonLat.js';
import { Node } from '../quadTree/Node.js';
import { NormalMapCreator } from '../utils/NormalMapCreator.js';
import { PlanetCamera } from '../camera/PlanetCamera.js';
import { RenderNode } from './RenderNode.js';
import { Segment } from '../segment/Segment.js';
import { SegmentLonLat } from '../segment/SegmentLonLat.js';
import { PlainSegmentWorker } from '../segment/PlainSegmentWorker.js';
import { TerrainWorker } from '../utils/TerrainWorker.js';
import { VectorTileCreator } from '../utils/VectorTileCreator.js';
import { wgs84 } from '../ellipsoid/wgs84.js';
import { print2d } from '../utils/shared.js';
import { NIGHT } from '../res/night.js';
import { SPECULAR } from '../res/spec.js';
import { Plane } from '../math/Plane.js';
import { Geoid } from '../terrain/Geoid.js';
import { doubleToTwoFloats } from '../math/coder.js';

const MAX_LOD = 1.0;
const MIN_LOD = 0.95;

/**
 * Maximum created nodes count. The more nodes count the more memory usage.
 * @const
 * @type {number}
 * @default
 */
const MAX_NODES = 500;

const GLOBAL_DRAW_PRIORITY = -math.MAX;

const EVENT_NAMES = [
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
    "layervisibilitychange"
];

/**
 * Main class for rendering planet
 * @class
 * @extends {og.scene.RenderNode}
 * @param {string} name - Planet name(Earth by default)
 * @param {og.Ellipsoid} ellipsoid - Planet ellipsoid(WGS84 by default)
 * @fires og.scene.Planet#draw
 * @fires og.scene.Planet#layeradd
 * @fires og.scene.Planet#baselayerchange
 * @fires og.scene.Planet#layerremove
 * @fires og.scene.Planet#layervisibilitychange
 * @fires og.scene.Planet#geoimageadd
 */
class Planet extends RenderNode {
    constructor(name, ellipsoid) {
        super(name);

        /**
         * @public
         * @type {og.Ellipsoid}
         */
        this.ellipsoid = ellipsoid || wgs84;

        /**
         * Squared ellipsoid radius.
         * @protected
         * @type {number}
         */
        this._planetRadius2 = this.ellipsoid.getPolarSize() * this.ellipsoid.getPolarSize();

        /**
         * All layers array.
         * @public
         * @type {Array.<og.Layer>}
         */
        this.layers = [];

        /**
         * Current visible imagery tile layers array.
         * @public
         * @type {Array.<og.Layer>}
         */
        this.visibleTileLayers = [];

        /**
         * Current visible vector layers array.
         * @protected
         * @type {Array.<og.layer.Vector>}
         */
        this.visibleVectorLayers = [];

        this._visibleTileLayerSlices = [];

        /**
         * Vector layers visible nodes with collections.
         * @protected
         * @type {Array.<og.EntityCollection>}
         */
        this._frustumEntityCollections = [];

        /**
         * There is only one base layer on the globe when layer.isBaseLayer is true.
         * @public
         * @type {og.Layer}
         */
        this.baseLayer = null;

        /**
         * Terrain provider.
         * @public
         * @type {og.terrain.Terrain}
         */
        this.terrain = null;

        /**
         * Camera is this.renderer.activeCamera pointer.
         * @public
         * @type {og.PlanetCamera}
         */
        this.camera = null;

        /**
         * Screen mouse pointer projected to planet cartesian position.
         * @public
         * @type {og.Vec3}
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

        this._viewExtent = null;

        /**
         * @protected
         */
        this._createdNodesCount = 0;

        /**
         * Planet's segments collected for rendering frame.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._renderedNodes = [];

        /**
         * Created nodes cache
         * @protected
         * @type {og.quadTree.Node}
         */
        this._quadTreeNodesCacheMerc = {};

        /**
         * Current visible mercator segments tree nodes array.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._visibleNodes = {};

        /**
         * Current visible north pole nodes tree nodes array.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._visibleNodesNorth = {};

        /**
         * Current visible south pole nodes tree nodes array.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._visibleNodesSouth = {};

        /**
         * Layers activity lock.
         * @public
         * @type {og.idle.Lock}
         */
        this.layerLock = new Lock();

        /**
         * Terrain providers activity lock.
         * @public
         * @type {og.idle.Lock}
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

        /**
         * Precomputed indexes buffers for differrent grid size segments.
         * @protected
         * @type {Array.<Array.<number>>}
         */
        this._indexesBuffers = [];

        /**
         * Framebuffer for relief. Is null when WEBGL_draw_buffers extension initialized.
         * @protected
         * @type {Object}
         */
        this._heightPickingFramebuffer = null;

        /**
         * Calculates when mouse is moving or planet is rotating.
         * @protected
         * @type {number}
         */
        this._currentDistanceFromPixel = 0;

        /**
         * @protected
         */
        this._viewChanged = true;

        /**
         * Mercator grid tree.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._quadTree = null;

        /**
         * North grid tree.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._quadTreeNorth = null;

        /**
         * South grid tree.
         * @protected
         * @type {og.quadTree.Node}
         */
        this._quadTreeSouth = null;

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

        /**
         * True for rendering night glowing texture.
         * @protected
         * @type {boolean}
         */
        this._useNightTexture = true;

        /**
         * True for rendering specular mask texture.
         * @protected
         * @type {boolean}
         */
        this._useSpecularTexture = true;

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
        this._lodRatio = MAX_LOD;
        this._maxLodRatio = MAX_LOD;
        this._minLodRatio = MIN_LOD;


        this._diffuseMaterialArr = new Float32Array(this.SLICE_SIZE_3 + 3);
        this._ambientMaterialArr = new Float32Array(this.SLICE_SIZE_3 + 3);
        this._specularMaterialArr = new Float32Array(this.SLICE_SIZE_4 + 4);

        this._tileOffsetArr = new Float32Array(this.SLICE_SIZE_4);
        this._visibleExtentOffsetArr = new Float32Array(this.SLICE_SIZE_4);
        this._transparentColorArr = new Float32Array(this.SLICE_SIZE_4);
        this._pickingColorArr = new Float32Array(this.SLICE_SIZE_3);
        this._samplerArr = new Int32Array(this.SLICE_SIZE);
        this._pickingMaskArr = new Int32Array(this.SLICE_SIZE);

        /**
         * GeoImage creator.
         * @protected
         * @type{og.utils.GeoImageCreator}
         */
        this._geoImageCreator = null;

        this._vectorTileCreator = null;

        this._normalMapCreator = null;

        this._terrainWorker = new TerrainWorker(3);

        this._plainSegmentWorker = new PlainSegmentWorker(2);

        this._tileLoader = new Loader(14);

        this._memKey = new Key();

        //events initialization
        this.events.registerNames(EVENT_NAMES);

        this._tempPickingPix_ = new Uint8Array(4);

        this._distBeforeMemClear = 0.0;

        this._prevCamEye = new Vec3();
    }

    /**
     * Add the given control to the renderer of the planet scene.
     * @param {og.control.Control} control - Control.
     */
    addControl(control) {
        control.planet = this;
        control.addTo(this.renderer);
    }

    setRatioLod(maxLod, minLod) {
        this._maxLodRatio = maxLod;
        if (minLod)
            this._minLodRatio = minLod;
    }

    /**
     * Add the given controls array to the renderer of the planet.
     * @param {Array.<og.control.Control>} cArr - Control array.
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
     * @returns {og.Layer} -
     */
    getLayerByName(name) {
        var i = this.layers.length;
        while (i--) {
            if (this.layers[i].name === name)
                return this.layers[i];
        }
    }

    /**
     * Adds the given layer to the planet.
     * @param {og.Layer} layer - Layer object.
     * @public
     */
    addLayer(layer) {
        layer.addTo(this);
    }

    /**
     * Dispatch layer visibility changing event.
     * @param {og.Layer} layer - Changed layer.
     * @protected
     */
    _onLayerVisibilityChanged(layer) {
        this.events.dispatch(this.events.layervisibilitychange, layer);
    }

    /**
     * Adds the given layers array to the planet.
     * @param {Array.<og.Layer>} layers - Layers array.
     * @public
     */
    addLayers(layers) {
        for (var i = 0; i < layers.length; i++) {
            this.addLayer(layers[i]);
        }
    }

    /**
     * Removes the given layer from the planet.
     * @param {og.Layer} layer - Layer to remove.
     * @return {og.Layer|undefined} The removed layer or undefined if the layer was not found.
     * @public
     */
    removeLayer(layer) {
        return layer.remove();
    }

    /**
     *
     * @protected
     * @param {og.Layer} layer - Material layer.
     */
    _clearLayerMaterial(layer) {
        var lid = layer._id;
        this._quadTree.traverseTree(function (node) {
            var mats = node.segment.materials;
            if (mats[lid]) {
                mats[lid].clear();
                mats[lid] = null;
            }
        });
    }

    /**
     * Get the collection of layers associated with this planet.
     * @return {Array.<og.Layer>} Layers array.
     * @public
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Sets base layer coverage to the planet.
     * @param {og.Layer} layer - Layer object.
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
        if (this._heightFactor !== factor) {
            this._heightFactor = factor;
            this._quadTree.destroyBranches();
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
     * @param {og.terrain.Terrain} terrain - Terrain provider.
     */
    setTerrain(terrain) {

        //
        //TODO: Replace to terrain
        //

        this.terrain = terrain;
        this.terrain._planet = this;
        this._normalMapCreator && this._normalMapCreator.setBlur(terrain.blur != undefined ? terrain.blur : true);

        if (terrain._geoid) {
            terrain._geoid.model = null;
            Geoid.loadModel(terrain._geoid.src)
                .then((m) => {
                    terrain._geoid.model = m;
                    this._plainSegmentWorker.setGeoid(terrain._geoid);
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
        h.addProgram(shaders.drawnode_screen_wl(), true);
        h.addProgram(shaders.drawnode_colorPicking(), true);
        h.addProgram(shaders.drawnode_heightPicking(), true);

        this.renderer.addPickingCallback(this, this._renderColorPickingFramebufferPASS);

        this._heightPickingFramebuffer = new Framebuffer(this.renderer.handler, {
            'width': 320,
            'height': 240
        });

        this._heightPickingFramebuffer.init();
    }

    /**
     * @virtual
     * @public
     */
    init() {
        //Initialization indexes table
        var TABLESIZE = segmentHelper.TABLESIZE;

        //Iniytialize indexes buffers cache. It takes ~120mb RAM!
        for (var i = 0; i <= TABLESIZE; i++) {
            var c = Math.pow(2, i);
            !this._indexesCache[c] && (this._indexesCache[c] = []);
            for (var j = 0; j <= TABLESIZE; j++) {
                var w = Math.pow(2, j);
                !this._indexesCache[c][w] && (this._indexesCache[c][w] = []);
                for (var k = 0; k <= TABLESIZE; k++) {
                    var n = Math.pow(2, k);
                    !this._indexesCache[c][w][n] && (this._indexesCache[c][w][n] = []);
                    for (var m = 0; m <= TABLESIZE; m++) {
                        var e = Math.pow(2, m);
                        !this._indexesCache[c][w][n][e] && (this._indexesCache[c][w][n][e] = []);
                        for (var q = 0; q <= TABLESIZE; q++) {
                            var s = Math.pow(2, q);

                            var indexes = segmentHelper.createSegmentIndexes(c, [w, n, e, s]);

                            var buffer = null;

                            if (c === w && c === n && c === e && c === s) {
                                buffer = this.renderer.handler.createElementArrayBuffer(indexes, 1);
                            }

                            this._indexesCache[c][w][n][e][s] = {
                                'indexes': indexes,
                                'buffer': buffer
                            };
                        }
                    }
                }
            }
        }

        //create empty textures
        var that = this;
        this.renderer.handler.createDefaultTexture(null, function (t) {
            that.solidTextureOne = t;
            that.solidTextureTwo = t;
        });

        this.transparentTexture = this.renderer.handler.transparentTexture;

        this.camera = this.renderer.activeCamera = new PlanetCamera(this, {
            eye: new Vec3(0, 0, 28000000),
            look: new Vec3(0, 0, 0),
            up: new Vec3(0, 1, 0)
        });

        this.camera.update();

        //Creating quad trees nodes
        this._quadTree = new Node(Segment, this, quadTree.NW, null, 0, 0, Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]));
        this._quadTreeNorth = new Node(SegmentLonLat, this, quadTree.NW, null, 0, 0, Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90]));
        this._quadTreeSouth = new Node(SegmentLonLat, this, quadTree.NW, null, 0, 0, Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT]));

        this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;

        //Applying shaders
        this._initializeShaders();

        this.updateVisibleLayers();

        this.renderer.activeCamera.events.on("viewchange", function (e) {
            this._viewChanged = true;
        }, this);

        this.renderer.events.on("mousemove", function (e) {
            this._viewChanged = true;
        }, this);

        this.renderer.events.on("touchmove", function (e) {
            this._viewChanged = true;
        }, this);

        this.renderer.addPickingCallback(this, this._frustumEntityCollectionPickingCallback);

        //load Earth night glowing texture
        if (this._useNightTexture) {
            createImageBitmap(NIGHT).then((e) =>
                this._nightTexture = this.renderer.handler.createTexture_mm(e)
            );
        }

        //load water specular mask
        if (this._useSpecularTexture) {
            createImageBitmap(SPECULAR).then((e) =>
                this._specularTexture = this.renderer.handler.createTexture_l(e)
            );
        }

        this._geoImageCreator = new GeoImageCreator(this.renderer.handler);

        this._vectorTileCreator = new VectorTileCreator(this);

        this._normalMapCreator = new NormalMapCreator(this, {
            blur: this.terrain && (this.terrain.blur != undefined ? this.terrain.blur : true)
        });

        this.renderer.events.on("draw", this._globalPreDraw, this, -100);

        //Loads first nodes for better viewing if you have started on a lower altitude.
        this._preRender();
    }

    _preRender() {
        this._quadTree.createChildrenNodes();
        this._quadTree.segment.createPlainSegment();
        this._quadTree.renderNode();
        this._normalMapCreator.drawSingle(this._quadTree.segment);

        for (var i = 0; i < this._quadTree.nodes.length; i++) {
            this._quadTree.nodes[i].segment.createPlainSegment();
            this._quadTree.nodes[i].renderNode();
            this._normalMapCreator.drawSingle(this._quadTree.nodes[i].segment);
        }

        this._quadTreeNorth.createChildrenNodes();
        this._quadTreeNorth.segment.createPlainSegment();
        this._quadTreeNorth.renderNode();
        this._normalMapCreator.drawSingle(this._quadTreeNorth.segment);

        this._quadTreeSouth.createChildrenNodes();
        this._quadTreeSouth.segment.createPlainSegment();
        this._quadTreeSouth.renderNode();
        this._normalMapCreator.drawSingle(this._quadTreeSouth.segment);
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
        var html = "";
        for (var i = 0; i < this.layers.length; i++) {
            var li = this.layers[i];
            if (li._visibility) {
                if (li._attribution.length) {
                    html += "<li>" + li._attribution + "</li>";
                }
            }
        }

        if (this.renderer) {
            if (html.length) {
                this.renderer.div.attributions.style.display = "block";
                this.renderer.div.attributions.innerHTML = "<ul>" + html + "</ul>";
            } else {
                this.renderer.div.attributions.style.display = "none";
                this.renderer.div.attributions.innerHTML = "";
            }
        }
    }

    /**
     * Updates visible layers.
     * @public
     */
    updateVisibleLayers() {

        this.visibleTileLayers = [];
        this.visibleTileLayers.length = 0;

        this.visibleVectorLayers = [];
        this.visibleVectorLayers.length = 0;

        var html = "";
        for (var i = 0; i < this.layers.length; i++) {
            var li = this.layers[i];
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

        if (this.renderer) {
            if (html.length) {
                this.renderer.div.attributions.style.display = "block";
                this.renderer.div.attributions.innerHTML = "<ul>" + html + "</ul>";
            } else {
                this.renderer.div.attributions.style.display = "none";
                this.renderer.div.attributions.innerHTML = "";
            }
        }

        this._sortLayers();
    }

    /**
     * Sort visible layer - preparing for rendering.
     * @protected
     */
    _sortLayers() {

        this.visibleVectorLayers.sort(function (a, b) {
            return (a._zIndex - b._zIndex) || (a._height - b._height);
        });

        this._visibleTileLayerSlices = [];
        this._visibleTileLayerSlices.length = 0;

        if (this.visibleTileLayers.length) {
            this.visibleTileLayers.sort(function (a, b) {
                return a._height - b._height || a._zIndex - b._zIndex;
            });

            var k = -1;
            var currHeight = this.visibleTileLayers[0]._height;
            for (var i = 0; i < this.visibleTileLayers.length; i++) {
                if (i % this.SLICE_SIZE === 0 || this.visibleTileLayers[i]._height !== currHeight) {
                    k++;
                    this._visibleTileLayerSlices[k] = [];
                    currHeight = this.visibleTileLayers[i]._height;
                }
                this._visibleTileLayerSlices[k].push(this.visibleTileLayers[i]);
            }
        }
    }

    /**
     * Collects visible quad nodes.
     * @protected
     */
    _collectRenderNodes() {

        this._lodRatio = math.lerp(
            this.camera.slope < 0.0 ? 0.0 :
                this.camera.slope,
            this._maxLodRatio, this._minLodRatio
        );

        this.camera._insideSegment = null;

        this._nodeCounterError_ = 0;

        //clear first
        this._renderedNodes.length = 0;
        this._renderedNodes = [];

        this._viewExtent = null;

        this._visibleNodes = {};
        this._visibleNodesNorth = {};
        this._visibleNodesSouth = {};

        this.minCurrZoom = math.MAX;
        this.maxCurrZoom = math.MIN;

        this._quadTreeNorth.renderTree(this.camera, 0, null);
        this._quadTreeSouth.renderTree(this.camera, 0, null);
        this._quadTree.renderTree(this.camera, 0, null);

        //TODO:Abolish "magic" numbers
        if (this.renderer.activeCamera.slope > 0.8 &&
            this.renderer.activeCamera._lonLat.height < 850000.0 &&
            this.renderer.activeCamera._lonLat.height > 10000.0) {

            this.minCurrZoom = this.maxCurrZoom;

            var temp = this._renderedNodes;

            this._renderedNodes = [];

            for (var i = temp.length - 1; i >= 0; --i) {
                var ri = temp[i];
                if (ri.segment.tileZoom === this.maxCurrZoom || ri.segment._projection.id === EPSG4326.id) {
                    this._renderedNodes.push(ri);
                }
            }

            for (i = temp.length - 1; i >= 0; --i) {
                var seg = temp[i].segment;
                if (seg.tileZoom < this.maxCurrZoom && seg._projection.id !== EPSG4326.id) {
                    seg.node.renderTree(this.camera, this.maxCurrZoom, null);
                }
            }
        }

        //this._renderedNodes.push(this.camera._insideSegment.node);
    }

    _globalPreDraw() {

        this._distBeforeMemClear += this._prevCamEye.distance(this.camera.eye);
        this._prevCamEye.copy(this.camera.eye);

        this.renderer.activeCamera.checkFly();
    }

    /**
     * Render node callback.
     * @public
     */
    frame() {

        //free memory
        if (this._createdNodesCount > MAX_NODES && this._distBeforeMemClear > 10000.0) {
            this.memClear();
        }

        this._collectRenderNodes();

        //Here is the planet node dispatches a draw event before
        //rendering begins and we have got render nodes.
        this.events.dispatch(this.events.draw, this);

        this.transformLights();

        this._normalMapCreator.frame();

        this._singleframebufferRendering();

        //Creates geoImages textures.
        this._geoImageCreator.frame();
    }

    /**
     * @virtual
     * @protected
     */
    _singleframebufferRendering() {
        this._renderScreenNodesPASS();
        this._renderHeightPickingFramebufferPASS();
        this._renderVectorLayersPASS();
    }

    /**
     * @protected
     */
    _renderScreenNodesPASS() {

        let sh, shu;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        if (this.lightEnabled) {
            h.programs.drawnode_screen_wl.activate();
            sh = h.programs.drawnode_screen_wl._program;
            shu = sh.uniforms;

            gl.uniform4fv(shu.lightsPositions, this._lightsTransformedPositions);

            gl.uniformMatrix3fv(shu.normalMatrix, false, renderer.activeCamera._normalMatrix._m);
            gl.uniformMatrix4fv(shu.viewMatrix, false, renderer.activeCamera._viewMatrix._m);
            gl.uniformMatrix4fv(shu.projectionMatrix, false, renderer.activeCamera._projectionMatrix._m);

            //bind night glowing material
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, (this.camera._lonLat.height > 329958.0) && (this._nightTexture || this.transparentTexture) || this.transparentTexture);
            gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

            //bind specular material
            gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
            gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
            gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

            var b = this.baseLayer;
            if (b) {
                this._diffuseMaterialArr[0] = b.diffuse.x;
                this._diffuseMaterialArr[1] = b.diffuse.y;
                this._diffuseMaterialArr[2] = b.diffuse.z;

                this._ambientMaterialArr[0] = b.ambient.x;
                this._ambientMaterialArr[1] = b.ambient.y;
                this._ambientMaterialArr[2] = b.ambient.z;

                this._specularMaterialArr[0] = b.specular.x;
                this._specularMaterialArr[1] = b.specular.y;
                this._specularMaterialArr[2] = b.specular.z;
                this._specularMaterialArr[3] = b.shininess;
            } else {
                this._diffuseMaterialArr[0] = 0.89;
                this._diffuseMaterialArr[1] = 0.9;
                this._diffuseMaterialArr[2] = 0.83;

                this._ambientMaterialArr[0] = 0.0;
                this._ambientMaterialArr[1] = 0.0;
                this._ambientMaterialArr[2] = 0.0;

                this._specularMaterialArr[0] = 0.0003;
                this._specularMaterialArr[1] = 0.00012;
                this._specularMaterialArr[2] = 0.00001;
                this._specularMaterialArr[3] = 20.0;
            }
        } else {
            h.programs.drawnode_screen_nl.activate();
            sh = h.programs.drawnode_screen_nl._program;
            shu = sh.uniforms;
            gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix, false, renderer.activeCamera._projectionViewMatrix._m);
        }

        let cam = renderer.activeCamera;
        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        //draw planet's nodes
        var rn = this._renderedNodes,
            sl = this._visibleTileLayerSlices;

        if (sl.length) {
            let sli = sl[0];
            for (var i = sli.length - 1; i >= 0; --i) {
                let li = sli[i];
                if (li._fading && li._refreshFadingOpacity()) {
                    sli.splice(i, 1);
                }
            }
        }

        i = rn.length;
        while (i--) {

            let v = rn[i].segment.tempVerticesHigh,
                s = rn[i].segment.gridSize;

            if (Math.sqrt(v.length / 3) - 1 !== s) {
                console.log(rn[i]);
            }

            if (rn[i].segment.readyToEngage) {
                rn[i].segment.engage();
            }

            rn[i].segment._screenRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {

            let slj = sl[j];
            for (i = slj.length - 1; i >= 0; --i) {
                let li = slj[i];
                if (li._fading && li._refreshFadingOpacity()) {
                    slj.splice(i, 1);
                }
            }

            i = rn.length;
            gl.polygonOffset(0, -j);
            while (i--) {
                rn[i].segment._screenRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.disable(gl.BLEND);
    };

    /**
     * @protected
     */
    _renderHeightPickingFramebufferPASS() {

        this._heightPickingFramebuffer.activate();

        let sh;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.CULL_FACE);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        h.programs.drawnode_heightPicking.activate();
        sh = h.programs.drawnode_heightPicking._program;
        let shu = sh.uniforms;

        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix, false, renderer.activeCamera._projectionViewMatrix._m);

        let cam = renderer.activeCamera;
        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        //draw planet's nodes
        var rn = this._renderedNodes,
            sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            rn[i].segment._heightPickingRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {
            i = rn.length;
            gl.polygonOffset(0, -j);
            while (i--) {
                rn[i].segment._heightPickingRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.disable(gl.BLEND);

        this._heightPickingFramebuffer.deactivate();
    }

    /**
     * @protected
     */
    _renderColorPickingFramebufferPASS() {
        let sh;
        let renderer = this.renderer;
        let h = renderer.handler;
        let gl = h.gl;

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        h.programs.drawnode_colorPicking.activate();
        sh = h.programs.drawnode_colorPicking._program;
        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix, false, renderer.activeCamera._projectionViewMatrix._m);

        let shu = sh.uniforms;

        let cam = renderer.activeCamera;
        gl.uniform3fv(shu.eyePositionHigh, cam.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, cam.eyeLow);

        //draw planet's nodes
        var rn = this._renderedNodes,
            sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            rn[i].segment._colorPickingRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {
            i = rn.length;
            gl.polygonOffset(0, -j);
            while (i--) {
                rn[i].segment._colorPickingRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.disable(gl.BLEND);
    }

    /**
     * Vector layers rendering
     * @protected
     */
    _renderVectorLayersPASS() {

        this._frustumEntityCollections.length = 0;
        this._frustumEntityCollections = [];

        var i = this.visibleVectorLayers.length;
        while (i--) {

            let vi = this.visibleVectorLayers[i];

            if (vi._fading && vi._refreshFadingOpacity()) {
                this.visibleVectorLayers.splice(i, 1);
            }

            vi.collectVisibleCollections(this._frustumEntityCollections);
            vi.update();
        }

        //3d entities(billnoards, labesl, shapes etc.) rendering
        this.drawEntityCollections(this._frustumEntityCollections);

        //Vector tiles rasteriazation
        this._vectorTileCreator.frame();
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

        //??? private ???
        this.camera._insideSegment = null;

        this.layerLock.lock(this._memKey);
        this.terrainLock.lock(this._memKey);
        this._normalMapCreator.lock(this._memKey);

        this._normalMapCreator.clear();
        this.terrain.abortLoading();
        this._tileLoader.abort();

        var that = this;
        //setTimeout(function () {
        that._quadTree.clearTree();
        that._quadTreeNorth.clearTree();
        that._quadTreeSouth.clearTree();

        that.layerLock.free(that._memKey);
        that.terrainLock.free(that._memKey);
        that._normalMapCreator.free(that._memKey);
        //}, 0);

        this._createdNodesCount = 0;
    }

    /**
     * Returns ray vector hit ellipsoid coordinates.
     * If the ray doesn't hit ellipsoit returns null.
     * @public
     * @param {og.Ray} ray - Ray 3d.
     * @returns {og.Vec3} -
     */
    getRayIntersectionEllipsoid(ray) {
        return this.ellipsoid.hitRay(ray.origin, ray.direction);
    }

    /**
     * Returns 2d screen coordanates projection point to the planet ellipsoid 3d coordinates.
     * @public
     * @param {og.math.Pixel} px - 2D sreen coordinates.
     * @returns {og.Vec3} -
     */
    getCartesianFromPixelEllipsoid(px) {
        var cam = this.renderer.activeCamera;
        return this.ellipsoid.hitRay(cam.eye, cam.unproject(px.x, px.y));
    }

    /**
     * Returns 2d screen coordanates projection point to the planet ellipsoid geographical coordinates.
     * @public
     * @param {og.math.Pixel} px - 2D screen coordinates.
     * @returns {og.LonLat} -
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
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {og.Vec3} -
     */
    getCartesianFromMouseTerrain(force) {
        var ms = this.renderer.events.mouseState;
        var distance = this.getDistanceFromPixel(ms, force);
        if (distance) {
            return ms.direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
        }
        return null;
    }

    /**
     * Returns 3d cartesian coordinates on the relief planet by 2d screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {og.Vec2} px - Pixel screen 2d coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {og.Vec3} -
     */
    getCartesianFromPixelTerrain(px, force) {
        var distance = this.getDistanceFromPixel(px, force);
        if (distance) {
            var direction = this.renderer.activeCamera.unproject(px.x, px.y);
            return direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
        }
        return null;
    }

    /**
     * Returns geographical coordinates on the relief planet by 2d screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {og.Vec2} px - Pixel screen 2d coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {og.LonLat} -
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
     * @param {og.Vec3} coords - Cartesian coordinates.
     * @returns {og.Vec2} -
     */
    getPixelFromCartesian(coords) {
        return this.renderer.activeCamera.project(coords);
    }

    /**
     * Returns projected 2d screen coordinates by geographical coordinates.
     * @public
     * @param {og.LonLat} lonlat - Geographical coordinates.
     * @returns {og.Vec2} -
     */
    getPixelFromLonLat(lonlat) {
        var coords = this.ellipsoid.lonLatToCartesian(lonlat);
        if (coords)
            return this.renderer.activeCamera.project(coords);
        return null;
    }

    /**
     * Returns distance from active camera to the the planet ellipsoid
     * coordiantes unprojected by 2d screen coordiantes, or null if screen coordinates outside the planet.
     * @public
     * @param {og.Vec2} px - Screen coordinates.
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
     * @param {og.Vec2} px - Screen coordinates.
     * @param {Boolean} [force=false] - Force framebuffer rendering.
     * @returns {number} -
     */
    getDistanceFromPixel(px, force) {
        if (this._viewChanged || force) {
            this._viewChanged = false;
            var cnv = this.renderer.handler.canvas;

            this._heightPickingFramebuffer.activate();
            this._heightPickingFramebuffer.readPixels(this._tempPickingPix_, px.x / cnv.width, (cnv.height - px.y) / cnv.height);
            this._heightPickingFramebuffer.deactivate();

            var color = Vec4.fromVec(this._tempPickingPix_);

            if (!(color.x | color.y | color.z)) {
                return this._currentDistanceFromPixel = this.getDistanceFromPixelEllipsoid(px);
            }

            color.w = 0.0;
            this._currentDistanceFromPixel = coder.decodeFloatFromRGBA(color);
            return this._currentDistanceFromPixel;
        }
        return this._currentDistanceFromPixel;
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {og.Extent} extent - Geographical extent.
     */
    viewExtent(extent) {
        this.renderer.activeCamera.viewExtent(extent);
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {Array.<number,number,number,number>} extentArr - Geographical extent array,
     * where index 0 - southwest longitude, 1 - latitude southwest, 2 - longitude northeast, 3 - latitude northeast.
     */
    viewExtentArr(extentArr) {
        this.renderer.activeCamera.viewExtent(
            new Extent(new LonLat(extentArr[0], extentArr[1]),
                new LonLat(extentArr[2], extentArr[3])));
    }

    /**
     * Gets current viewing geographical extent.
     * @public
     * @returns {og.Extent} -
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
     * @param {og.LonLat} lonlat - New geographical position.
     * @param {og.Vec3} [up] - Camera UP vector.
     */
    viewLonLat(lonlat, up) {
        this.renderer.activeCamera.setLonLat(lonlat, up);
    }

    /**
     * Fly camera to the planet geographical extent.
     * @public
     * @param {og.Extent} extent - Geographical extent.
     * @param {Number} [height] - Height on the end of the flight route.
     * @param {og.Vec3} [up] - Camera UP vector on the end of a flying.
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
     * @param {og.Vec3} cartesian - Fly coordiantes.
     * @param {og.Vec3} [look] - Camera "look at" point.
     * @param {og.Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
     */
    flyCartesian(cartesian, look, up, ampl, completeCallback, startCallback, frameCallback) {
        this.renderer.activeCamera.flyCartesian(cartesian, look, up, ampl, completeCallback, startCallback, frameCallback);
    }

    /**
     * Fly camera to the new geographical position.
     * @public
     * @param {og.LonLat} lonlat - Fly geographical coordiantes.
     * @param {og.Vec3} [look] - Camera "look at" point on the end of a flying.
     * @param {og.Vec3} [up] - Camera UP vector on the end of a flying.
     * @param {Number} [ampl] - Altitude amplitude factor.
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
        for (let i = 0; i < this.layers.length; i++) {
            let li = this.layers[i];
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
        let n = this._renderedNodes,
            i = n.length;
        while (i--) {
            if (n[i].segment.isEntityInside(entity)) {
                return n[i].segment.getEntityTerrainPoint(entity, res);
            }
        }
    }
}

export { Planet };
