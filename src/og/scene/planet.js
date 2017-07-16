goog.provide('og.scene.Planet');

goog.require('og');
goog.require('og.inheritance');
goog.require('og.scene.RenderNode');
goog.require('og.math');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.math.Vector2');
goog.require('og.math.coder');
goog.require('og.quadTree');
goog.require('og.quadTree.QuadNode');
goog.require('og.bv.Sphere');
goog.require('og.PlanetCamera');
goog.require('og.shaderProgram.drawnode_nl');
goog.require('og.shaderProgram.drawnode_wl');
goog.require('og.shaderProgram.drawnode_screen_nl');
goog.require('og.shaderProgram.drawnode_screen_wl');
goog.require('og.shaderProgram.drawnode_colorPicking');
goog.require('og.shaderProgram.drawnode_heightPicking');
goog.require('og.layer');
goog.require('og.planetSegment');
goog.require('og.planetSegment.Segment');
goog.require('og.planetSegment.SegmentLonLat');
goog.require('og.PlanetSegmentHelper');
goog.require('og.mercator');
goog.require('og.LonLat');
goog.require('og.Extent');
goog.require('og.math.Ray');
goog.require('og.webgl');
goog.require('og.webgl.Framebuffer');
goog.require('og.mercator');
goog.require('og.proj.EPSG4326');
goog.require('og.ImageCanvas');
goog.require('og.planetSegment.NormalMapCreatorQueue');
goog.require('og.ellipsoid.wgs84');
goog.require('og.utils.GeoImageCreator');
goog.require('og.utils.VectorTileCreator');
goog.require('og.idle');
goog.require('og.utils.TerrainWorker');

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
og.scene.Planet = function (name, ellipsoid) {
    og.inheritance.base(this, name);

    /**
     * @public
     * @type {og.Ellipsoid}
     */
    this.ellipsoid = ellipsoid || og.ellipsoid.wgs84;

    /**
     * Squared ellipsoid radius.
     * @protected
     * @type {number}
     */
    this._planetRadius2 = this.ellipsoid.getPolarSize() * this.ellipsoid.getPolarSize();

    /**
     * All layers array.
     * @public
     * @type {Array.<og.layer.Layer>}
     */
    this.layers = [];

    /**
     * Current visible imagery tile layers array.
     * @public
     * @type {Array.<og.layer.Layer>}
     */
    this.visibleTileLayers = [];
    this._visibleTileLayerSlices = [];

    /**
     * Current visible vector layers array.
     * @protected
     * @type {Array.<og.layer.Vector>}
     */
    this.visibleVectorLayers = [];

    /**
     * Vector layers visible nodes with collections.
     * @protected
     * @type {Array.<og.EntityCollection>}
     */
    this._frustumEntityCollections = [];

    /**
     * There is only one base layer on the globe when layer.isBaseLayer is true.
     * @public
     * @type {og.layer.Layer}
     */
    this.baseLayer = null;

    /**
     * Terrain provider.
     * @public
     * @type {og.terrainProvider.TerrainProvider}
     */
    this.terrainProvider = null;

    /**
     * Camera is this.renderer.activeCamera pointer.
     * @public
     * @type {og.PlanetCamera}
     */
    this.camera = null;

    /**
     * Screen mouse pointer projected to planet cartesian position.
     * @public
     * @type {og.math.Vector3}
     */
    this.mousePositionOnEarth = new og.math.Vector3();

    this.emptyTexture = null;
    this.transparentTexture = null;
    this.defaultTexture = null;

    // /**
    //  * Object async creates normal map segment textures.
    //  * @public
    //  * @type {og.planetSegment.NormalMapCreatorQueue}
    //  */
    // this.normalMapCreator = null;

    /**
     * Current visible minimal zoom index planet segment.
     * @public
     * @type {number}
     */
    this.minCurrZoom = og.math.MAX;

    /**
     * Current visible maximal zoom index planet segment.
     * @public
     * @type {number}
     */
    this.maxCurrZoom = og.math.MIN;

    /**
     * Current view geodetic WGS84 extent.
     * @protected
     * @type {og.Extent}
     */
    this._viewExtentWGS84 = null;

    /**
     * Current view geodetic Web Mercator extent.
     * @protected
     * @type {og.Extent}
     */
    this._viewExtentMerc = null;

    /**
     * @protected
     */
    this._createdNodesCount = 0;

    /**
     * Planet's segments collected for the rendering frame.
     * @protected
     * @type {og.quadTree.QuadNode}
     */
    this._renderedNodes = [];

    /**
     * Current visible mercator segments tree nodes array.
     * @protected
     * @type {og.quadTree.QuadNode}
     */
    this._visibleNodes = {};

    /**
     * Current visible north pole nodes tree nodes array.
     * @protected
     * @type {og.quadTree.QuadNode}
     */
    this._visibleNodesNorth = {};

    /**
     * Current visible south pole nodes tree nodes array.
     * @protected
     * @type {og.quadTree.QuadNode}
     */
    this._visibleNodesSouth = {};

    /**
     * Layers activity lock.
     * @public
     * @type {og.idle.Lock}
     */
    this.layerLock = new og.idle.Lock();

    /**
     * Terrain providers activity lock.
     * @public
     * @type {og.idle.Lock}
     */
    this.terrainLock = new og.idle.Lock();

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
     * Precomputed indexes buffer array for differrent grid size segments.
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
     * @type {og.quadTree.QuadNode}
     */
    this._quadTree = null;

    /**
     * North grid tree.
     * @protected
     * @type {og.quadTree.QuadNode}
     */
    this._quadTreeNorth = null;

    /**
     * South grid tree.
     * @protected
     * @type {og.quadTree.QuadNode}
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
    this.RATIO_LOD = 1.12;

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

    this._terrainWorker = new og.utils.TerrainWorker(12);

    /**
     * @protected
     */
    this._fnRendering = null;

    this._memKey = new og.idle.Key();

    //events initialization
    this.events.registerNames(og.scene.Planet.EVENT_NAMES);
};

og.inheritance.extend(og.scene.Planet, og.scene.RenderNode);

/**
 * Maximum created nodes count. The more nodes count the more memory usage.
 * @const
 * @type {number}
 * @default
 */
og.scene.Planet.MAX_NODES = 120;

og.scene.Planet.EVENT_NAMES = [
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
 * Add the given control to the renderer of the planet scene.
 * @param {og.control.BaseControl} control - Control.
 */
og.scene.Planet.prototype.addControl = function (control) {
    control.planet = this;
    control.addTo(this.renderer);
};

/**
 * Add the given controls array to the renderer of the planet.
 * @param {Array.<og.control.BaseControl>} cArr - Control array.
 */
og.scene.Planet.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        this.addControl(cArr[i]);
    }
};

/**
 * Return layer by it name
 * @param {string} name - Name of the layer. og.layer.Layer.prototype.name
 * @public
 * @returns {og.layer.Layer}
 */
og.scene.Planet.prototype.getLayerByName = function (name) {
    var i = this.layers.length;
    while (i--) {
        if (this.layers[i].name === name)
            return this.layers[i];
    }
};

/**
 * Adds the given layer to the planet.
 * @param {og.layer.Layer} layer - Layer object.
 * @public
 */
og.scene.Planet.prototype.addLayer = function (layer) {
    layer.addTo(this);
};

/**
 * Dispatch layer visibility changing event.
 * @param {og.layer.Layer} layer - Changed layer.
 * @protected
 */
og.scene.Planet.prototype._onLayerVisibilityChanged = function (layer) {
    this.events.dispatch(this.events.layervisibilitychange, layer);
};

/**
 * Adds the given layers array to the planet.
 * @param {Array.<og.layer.Layer>} layers - Layers array.
 * @public
 */
og.scene.Planet.prototype.addLayers = function (layers) {
    for (var i = 0; i < layers.length; i++) {
        this.addLayer(layers[i]);
    }
};

/**
 * Removes the given layer from the planet.
 * @param {og.layer.Layer} layer - Layer to remove.
 * @return {og.layer.Layer|undefined} The removed layer or undefined if the layer was not found.
 * @public
 */
og.scene.Planet.prototype.removeLayer = function (layer) {
    return layer.remove();
};

/**
 *
 * @protected
 * @param {og.layer.Layer} layer
 */
og.scene.Planet.prototype._clearLayerMaterial = function (layer) {
    var lid = layer._id;
    this._quadTree.traverseTree(function (node) {
        var mats = node.planetSegment.materials;
        if (mats[lid]) {
            mats[lid].clear();
            mats[lid] = null;
        }
    });
};

/**
 * Get the collection of layers associated with this planet.
 * @return {Array.<og.layer.Layer>} Layers array.
 * @public
 */
og.scene.Planet.prototype.getLayers = function () {
    return this.layers;
};

/**
 * Sets base layer coverage to the planet.
 * @param {og.layer.Layer} layer - Layer object.
 * @public
 */
og.scene.Planet.prototype.setBaseLayer = function (layer) {
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
};

/**
 * Sets elevation scale. 1.0 is default.
 * @param {number} factor - Elevation scale.
 */
og.scene.Planet.prototype.setHeightFactor = function (factor) {
    if (this._heightFactor !== factor) {
        this._heightFactor = factor;
        var n = this._quadTree.nodes;
        this._quadTree.nodes = [];
        for (var i = 0; i < n.length; i++) {
            n[i].destroyBranches();
        }
    }
};

/**
 * Gets elevation scale.
 * @returns {number} Terrain elevation scale
 */
og.scene.Planet.prototype.getHeightFactor = function () {
    return this._heightFactor;
};

/**
 * Sets terrain provider
 * @public
 * @param {og.terrainProvider.TerrainProvider} terrain - Terrain provider.
 */
og.scene.Planet.prototype.setTerrainProvider = function (terrain) {
    this.terrainProvider = terrain;
    this.terrainProvider._planet = this;
};

/**
 * @virtual
 * @protected
 */
og.scene.Planet.prototype._initializeShaders = function () {
    var h = this.renderer.handler;
    if (this.renderer.isMultiFramebufferCompatible()) {
        h.addShaderProgram(og.shaderProgram.drawnode_nl(), true);
        h.addShaderProgram(og.shaderProgram.drawnode_wl(), true);
        this._fnRendering = this._multiframebufferRendering;
    } else {
        h.addShaderProgram(og.shaderProgram.drawnode_screen_nl(), true);
        h.addShaderProgram(og.shaderProgram.drawnode_screen_wl(), true);
        h.addShaderProgram(og.shaderProgram.drawnode_colorPicking(), true);
        h.addShaderProgram(og.shaderProgram.drawnode_heightPicking(), true);
        this._fnRendering = this._singleframebufferRendering;

        this.renderer.addPickingCallback(this, this._renderColorPickingFramebufferPASS);

        this._heightPickingFramebuffer = new og.webgl.Framebuffer(this.renderer.handler, {
            'width': 320,
            'height': 240
        });
    }
};

/**
 * @virtual
 * @public
 */
og.scene.Planet.prototype.initialization = function () {
    //Initialization indexes table
    var TABLESIZE = 6;
    og.PlanetSegmentHelper.initIndexesTables(TABLESIZE);

    //Iniytialize indexes buffers cache. It takes ~120mb RAM!
    for (var i = 0; i <= TABLESIZE; i++) {
        var c = Math.pow(2, i);
        !this._indexesBuffers[c] && (this._indexesBuffers[c] = []);
        for (var j = 0; j <= TABLESIZE; j++) {
            var w = Math.pow(2, j);
            !this._indexesBuffers[c][w] && (this._indexesBuffers[c][w] = []);
            for (var k = 0; k <= TABLESIZE; k++) {
                var n = Math.pow(2, k);
                !this._indexesBuffers[c][w][n] && (this._indexesBuffers[c][w][n] = []);
                for (var m = 0; m <= TABLESIZE; m++) {
                    var e = Math.pow(2, m);
                    !this._indexesBuffers[c][w][n][e] && (this._indexesBuffers[c][w][n][e] = []);
                    for (var q = 0; q <= TABLESIZE; q++) {
                        var s = Math.pow(2, q);
                        !this._indexesBuffers[c][w][n][e][s] && (this._indexesBuffers[c][w][n][e][s] = []);
                        var indexes = og.PlanetSegmentHelper.createSegmentIndexes(c, [w, n, e, s]);
                        this._indexesBuffers[c][w][n][e][s] = this.renderer.handler.createElementArrayBuffer(indexes, 1, indexes.length);
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

    this.camera = this.renderer.activeCamera = new og.PlanetCamera(this, {
        eye: new og.math.Vector3(0, 0, 28000000),
        look: new og.math.Vector3(0, 0, 0),
        up: new og.math.Vector3(0, 1, 0)
    });

    //Creating quad trees nodes
    this._quadTree = new og.quadTree.QuadNode(og.planetSegment.Segment, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]));
    this._quadTreeNorth = new og.quadTree.QuadNode(og.planetSegment.SegmentLonLat, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-180, og.mercator.MAX_LAT, 180, 90]));
    this._quadTreeSouth = new og.quadTree.QuadNode(og.planetSegment.SegmentLonLat, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-180, -90, 180, og.mercator.MIN_LAT]));

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

    ////normal map renderer initialization
    ////this.normalMapCreator = new og.planetSegment.NormalMapCreatorQueue(128, 128);

    //temporary initializations
    var that = this;
    //this.renderer.events.on("charkeypress", og.input.KEY_C, function () { that.memClear(); });

    this.renderer.addPickingCallback(this, this._frustumEntityCollectionPickingCallback);

    //load Earth night glowing texture
    if (this._useNightTexture) {
        var img = new Image();
        img.crossOrigin = '';
        img.onload = function () {
            that._nightTexture = that.renderer.handler.createTexture_mm(this);
        };
        img.src = og.RESOURCES_URL + "night.png";
    }

    //load water specular mask
    if (this._useSpecularTexture) {
        var img2 = new Image();
        img2.crossOrigin = '';
        img2.onload = function () {
            that._specularTexture = that.renderer.handler.createTexture_l(this);
        };
        img2.src = og.RESOURCES_URL + "spec.png";
    }

    this._geoImageCreator = new og.utils.GeoImageCreator(this.renderer.handler);

    this._vectorTileCreator = new og.utils.VectorTileCreator(this);

    this._normalMapCreator = new og.utils.NormalMapCreator(this.renderer.handler);

    //Loads first nodes for better viewing if you have started on a lower altitude.
    this._preRender();
};

og.scene.Planet.prototype._preRender = function () {
    this._quadTree.traverseNodes();
    this._quadTree.renderNode();
    //this._quadTree.planetSegment.createNormalMapTexture();

    this._quadTreeNorth.traverseNodes();
    this._quadTreeNorth.renderNode();

    this._quadTreeSouth.traverseNodes();
    this._quadTreeSouth.renderNode();
};

/**
 * Creates default textures first for nirth pole and whole globe and second for south pole.
 * @public
 * @param{Object} param0
 * @param{Object} param1
 */
og.scene.Planet.prototype.createDefaultTextures = function (param0, param1) {
    this.renderer.handler.gl.deleteTexture(this.solidTextureOne);
    this.renderer.handler.gl.deleteTexture(this.solidTextureTwo);
    var that = this;
    this.renderer.handler.createDefaultTexture(param0, function (t) {
        that.solidTextureOne = t;
    });
    this.renderer.handler.createDefaultTexture(param1, function (t) {
        that.solidTextureTwo = t;
    });
};

/**
 * Updates attribution lists
 * @public
 */
og.scene.Planet.prototype.updateAttributionsList = function () {
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
};

/**
 * Updates visible layers.
 * @public
 */
og.scene.Planet.prototype.updateVisibleLayers = function () {

    this.visibleTileLayers = [];
    this.visibleTileLayers.length = 0;

    this.visibleVectorLayers = [];
    this.visibleVectorLayers.length = 0;

    var html = "";
    for (var i = 0; i < this.layers.length; i++) {
        var li = this.layers[i];
        if (li._visibility) {
            if (li._isBaseLayer) {
                this.baseLayer = li;
            }

            if (li.hasImageryTiles()) {
                this.visibleTileLayers.push(li);
            }

            if (li instanceof og.layer.Vector) {
                this.visibleVectorLayers.push(li);
            }

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

    this._sortLayers();
};

/**
 * Sort visible layer - preparing for rendering.
 * @protected
 */
og.scene.Planet.prototype._sortLayers = function () {


    this.visibleVectorLayers.sort(function (a, b) {
        return (a._zIndex - b._zIndex) || (a._height - b._height);
    });


    if (this.visibleTileLayers.length) {
        this.visibleTileLayers.sort(function (a, b) {
            return a._height - b._height || a._zIndex - b._zIndex;
        });

        this._visibleTileLayerSlices = [];
        this._visibleTileLayerSlices.length = 0;
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
};

/**
 * Collects visible quad nodes.
 * @protected
 */
og.scene.Planet.prototype._collectRenderNodes = function () {

    //clear first
    this._renderedNodes.length = 0;
    this._renderedNodes = [];

    this._viewExtentWGS84 = null;
    this._viewExtentMerc = null;

    this._visibleNodes = {};
    this._visibleNodesNorth = {};
    this._visibleNodesSouth = {};

    this._frustumEntityCollections.length = 0;
    this._frustumEntityCollections = [];

    this.minCurrZoom = og.math.MAX;
    this.maxCurrZoom = og.math.MIN;

    this._quadTreeNorth.renderTree();
    this._quadTreeSouth.renderTree();
    this._quadTree.renderTree();
};

/**
 * Render node callback.
 * @public
 */
og.scene.Planet.prototype.frame = function () {

    //Here is the planet node dispatches a draw event before rendering begins.
    this.events.dispatch(this.events.draw, this);

    this._collectRenderNodes();

    this.renderer.activeCamera.prepareFrame();

    // print2d("lbTiles", this.layerLock._lock, 100, 100);
    // print2d("l1", this.terrainLock._lock, 100, 140);
    // print2d("l2", this.normalMapCreator._lock._lock, 100, 180);

    print2d("lbTiles", "layer: " + og.layer.XYZ.__requestsCounter + ", " + this.baseLayer._pendingsQueue.length + ", " + this.baseLayer._counter, 100, 100);
    print2d("t2", "terrain: " + this.terrainProvider._counter + ", " + this.terrainProvider._pendingsQueue.length, 100, 140);
    print2d("t1", "normal: " + this._normalMapCreator._queue.length, 100, 180);
    print2d("t3", this.maxCurrZoom, 100, 200);


    this.transformLights();

    this._normalMapCreator.frame();

    this._fnRendering();

    //Creates geoImages textures.
    this._geoImageCreator.frame();

    //free memory
    var that = this;
    if (this._createdNodesCount > og.scene.Planet.MAX_NODES) {
        setTimeout(function () {
            that.memClear();
        }, 0);
        that._createdNodesCount = 0;
    }
};

/**
 * @virtual
 * @protected
 */
og.scene.Planet.prototype._multiframebufferRendering = function () {
    this._multiRenderNodesPASS();
    this._renderVectorLayersPASS();
};

/**
 * @virtual
 * @protected
 */
og.scene.Planet.prototype._singleframebufferRendering = function () {
    this._renderScreenNodesPASS();
    this._renderHeightPickingFramebufferPASS();
    this._renderVectorLayersPASS();
};

/**
 * @protected
 */
og.scene.Planet.prototype._renderScreenNodesPASS = function () {

    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (this.lightEnabled) {
        h.shaderPrograms.drawnode_screen_wl.activate();
        sh = h.shaderPrograms.drawnode_screen_wl._program,
            shu = sh.uniforms;

        gl.uniform4fv(shu.lightsPositions._pName, this._lightsTransformedPositions);

        gl.uniformMatrix3fv(shu.normalMatrix._pName, false, renderer.activeCamera._normalMatrix._m);
        gl.uniformMatrix4fv(shu.viewMatrix._pName, false, renderer.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, renderer.activeCamera._projectionMatrix._m);

        //bind night glowing material
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, (this.camera._lonLat.height > 329958.0) && (this._nightTexture || this.transparentTexture) || this.transparentTexture);
        gl.uniform1i(shu.nightTexture._pName, this.SLICE_SIZE);

        //bind specular material
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
        gl.uniform1i(shu.specularTexture._pName, this.SLICE_SIZE + 1);

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
        h.shaderPrograms.drawnode_screen_nl.activate();
        sh = h.shaderPrograms.drawnode_screen_nl._program;
        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);
    }

    //draw planet's nodes
    var rn = this._renderedNodes,
        sl = this._visibleTileLayerSlices;

    var i = rn.length;
    while (i--) {
        rn[i].planetSegment._screenRendering(sh, sl[0], 0);
    }

    gl.enable(gl.POLYGON_OFFSET_FILL);
    for (j = 1; j < sl.length; j++) {
        i = rn.length;
        gl.polygonOffset(0, -j);
        while (i--) {
            rn[i].planetSegment._screenRendering(sh, sl[j], j, this.transparentTexture, true);
        }
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.disable(gl.BLEND);
};

/**
 * @protected
 */
og.scene.Planet.prototype._renderHeightPickingFramebufferPASS = function () {

    this._heightPickingFramebuffer.activate();

    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    h.shaderPrograms.drawnode_heightPicking.activate();
    sh = h.shaderPrograms.drawnode_heightPicking._program;
    gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);

    h.gl.uniform3fv(sh.uniforms.cameraPosition._pName, renderer.activeCamera.eye.toVec());

    //draw planet's nodes
    var rn = this._renderedNodes,
        sl = this._visibleTileLayerSlices;

    var i = rn.length;
    while (i--) {
        rn[i].planetSegment._heightPickingRendering(sh, sl[0], 0);
    }

    gl.enable(gl.POLYGON_OFFSET_FILL);
    for (j = 1; j < sl.length; j++) {
        i = rn.length;
        gl.polygonOffset(0, -j);
        while (i--) {
            rn[i].planetSegment._heightPickingRendering(sh, sl[j], j, this.transparentTexture, true);
        }
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.disable(gl.BLEND);

    this._heightPickingFramebuffer.deactivate();
};

/**
 * @protected
 */
og.scene.Planet.prototype._renderColorPickingFramebufferPASS = function () {
    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    //gl.polygonOffset(0, 0);
    //gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0, -637000);

    h.shaderPrograms.drawnode_colorPicking.activate();
    sh = h.shaderPrograms.drawnode_colorPicking._program;
    gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);

    //draw planet's nodes
    var rn = this._renderedNodes,
        sl = this._visibleTileLayerSlices;

    var i = rn.length;
    while (i--) {
        rn[i].planetSegment._colorPickingRendering(sh, sl[0], 0);
    }

    gl.enable(gl.POLYGON_OFFSET_FILL);
    for (j = 1; j < sl.length; j++) {
        i = rn.length;
        gl.polygonOffset(0, -637000 - j);
        while (i--) {
            rn[i].planetSegment._colorPickingRendering(sh, sl[j], j, this.transparentTexture, true);
        }
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.disable(gl.BLEND);
};


/**
 * @protected
 */
og.scene.Planet.prototype._multiRenderNodesPASS = function () {

    var sh;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (this.lightEnabled) {
        h.shaderPrograms.drawnode_wl.activate();
        sh = h.shaderPrograms.drawnode_wl._program,
            shu = sh.uniforms;

        gl.uniform4fv(shu.lightsPositions._pName, this._lightsTransformedPositions);

        gl.uniformMatrix3fv(shu.normalMatrix._pName, false, renderer.activeCamera._normalMatrix._m);
        gl.uniformMatrix4fv(shu.viewMatrix._pName, false, renderer.activeCamera._viewMatrix._m);
        gl.uniformMatrix4fv(shu.projectionMatrix._pName, false, renderer.activeCamera._projectionMatrix._m);

        //bind night glowing material
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE * 2);
        gl.bindTexture(gl.TEXTURE_2D, (this.camera._lonLat.height > 329958.0) && (this._nightTexture || this.transparentTexture) || this.transparentTexture);
        gl.uniform1i(shu.nightTexture._pName, this.SLICE_SIZE * 2);

        //bind specular material
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE * 2 + 1);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture || this.transparentTexture);
        gl.uniform1i(shu.specularTexture._pName, this.SLICE_SIZE * 2 + 1);

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
        h.shaderPrograms.drawnode_nl.activate();
        sh = h.shaderPrograms.drawnode_nl._program;
        gl.uniformMatrix4fv(sh.uniforms.projectionViewMatrix._pName, false, renderer.activeCamera._projectionViewMatrix._m);
    }

    h.gl.uniform3fv(sh.uniforms.cameraPosition._pName, renderer.activeCamera.eye.toVec());

    //draw planet's nodes
    var rn = this._renderedNodes,
        sl = this._visibleTileLayerSlices;

    var i = rn.length;
    while (i--) {
        rn[i].planetSegment._multiRendering(sh, sl[0]);
    }

    gl.enable(gl.POLYGON_OFFSET_FILL);
    for (j = 1; j < sl.length; j++) {
        i = rn.length;
        gl.polygonOffset(0, -j);
        while (i--) {
            rn[i].planetSegment._multiRendering(sh, sl[j], this.transparentTexture, true);
        }
    }

    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.disable(gl.BLEND);
};

/**
 * Vector layers rendering
 * @protected
 */
og.scene.Planet.prototype._renderVectorLayersPASS = function () {

    var i = this.visibleVectorLayers.length;
    while (i--) {
        var vi = this.visibleVectorLayers[i];
        vi._geometryHandler.update();
        vi.collectVisibleCollections(this._frustumEntityCollections);
        vi.events.dispatch(vi.events.draw, vi);
    }

    //3d entities(billnoards, labesl, shapes etc.) rendering
    this.drawEntityCollections(this._frustumEntityCollections);

    //Vector tiles rasteriazation
    this._vectorTileCreator.frame();
};

/**
 * Vector layers picking pass.
 * @protected
 */
og.scene.Planet.prototype._frustumEntityCollectionPickingCallback = function () {
    this.drawPickingEntityCollections(this._frustumEntityCollections);
};

/**
 * Starts clear memory thread.
 * @public
 */
og.scene.Planet.prototype.memClear = function () {

    this.layerLock.lock(this._memKey);
    this.terrainLock.lock(this._memKey);
    this._normalMapCreator.lock(this._memKey);

    //this.normalMapCreator.abort();
    this.terrainProvider.abortLoading();

    this._quadTree.clearTree();
    this._quadTreeNorth.clearTree();
    this._quadTreeSouth.clearTree();

    this.layerLock.free(this._memKey);
    this.terrainLock.free(this._memKey);
    this._normalMapCreator.free(this._memKey);
};

/**
 * Returns ray vector hit ellipsoid coordinates.
 * If the ray doesn't hit ellipsoit returns null.
 * @public
 * @param {og.math.Ray} ray - Ray 3d.
 * @returns {og.math.Vector3}
 */
og.scene.Planet.prototype.getRayIntersectionEllipsoid = function (ray) {
    return this.ellipsoid.hitRay(ray.origin, ray.direction);
};

/**
 * Returns 2d screen coordanates projection point to the planet ellipsoid 3d coordinates.
 * @public
 * @param {og.math.Pixel} px - 2D sreen coordinates.
 */
og.scene.Planet.prototype.getCartesianFromPixelEllipsoid = function (px) {
    var cam = this.renderer.activeCamera;
    return this.ellipsoid.hitRay(cam.eye, cam.unproject(px.x, px.y));
};

/**
 * Returns 2d screen coordanates projection point to the planet ellipsoid geographical coordinates.
 * @public
 * @param {og.math.Pixel} px - 2D screen coordinates.
 * @returns {og.LonLat}
 */
og.scene.Planet.prototype.getLonLatFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    if (coords) {
        return this.ellipsoid.cartesianToLonLat(coords);
    }
    return null;
};

/**
 * Returns 3d cartesian coordinates on the relief planet by mouse cursor
 * position or null if mouse cursor is outside the planet.
 * @public
 * @returns {og.math.Vector3}
 */
og.scene.Planet.prototype.getCartesianFromMouseTerrain = function (force) {
    var ms = this.renderer.events.mouseState;
    var distance = this.getDistanceFromPixel(ms, force);
    if (distance) {
        return ms.direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
    }
    return null;
};

/**
 * Returns 3d cartesian coordinates on the relief planet by 2d screen coordinates.
 * position or null if input coordinates is outside the planet.
 * @public
 * @param {og.math.Vector2} px - Pixel screen 2d coordinates.
 * @returns {og.math.Vector3}
 */
og.scene.Planet.prototype.getCartesianFromPixelTerrain = function (px, force) {
    var distance = this.getDistanceFromPixel(px, force);
    if (distance) {
        var direction = this.renderer.activeCamera.unproject(px.x, px.y);
        return direction.scaleTo(distance).addA(this.renderer.activeCamera.eye);
    }
    return null;
};

/**
 * Returns geographical coordinates on the relief planet by 2d screen coordinates.
 * position or null if input coordinates is outside the planet.
 * @public
 * @param {og.math.Vector2} px - Pixel screen 2d coordinates.
 * @returns {og.LonLat}
 */
og.scene.Planet.prototype.getLonLatFromPixelTerrain = function (px, force) {
    var coords = this.getCartesianFromPixelTerrain(px, force);
    if (coords) {
        return this.ellipsoid.cartesianToLonLat(coords);
    }
    return null;
};

/**
 * Returns projected 2d screen coordinates by 3d cartesian coordiantes.
 * @public
 * @param {og.math.Vector3} coords - Cartesian coordinates.
 * @returns {og.math.Vector2}
 */
og.scene.Planet.prototype.getPixelFromCartesian = function (coords) {
    return this.renderer.activeCamera.project(coords);
};

/**
 * Returns projected 2d screen coordinates by geographical coordinates.
 * @public
 * @param {og.LonLat} lonlat - Geographical coordinates.
 * @returns {og.math.Vector2}
 */
og.scene.Planet.prototype.getPixelFromLonLat = function (lonlat) {
    var coords = this.ellipsoid.lonLatToCartesian(lonlat);
    if (coords)
        return this.renderer.activeCamera.project(coords);
    return null;
};

/**
 * Returns distance from active camera to the the planet ellipsoid
 * coordiantes unprojected by 2d screen coordiantes, or null if screen coordinates outside the planet.
 * @public
 * @param {og.math.Vector2} px
 * @returns {number}
 */
og.scene.Planet.prototype.getDistanceFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    return coords ? coords.distance(this.renderer.activeCamera.eye) : null;
};

/**
 * Returns distance from active camera to the the relief planet coordiantes unprojected
 * by 2d screen coordiantes, or null if screen coordinates outside the planet.
 * If screen coordinates inside the planet but relief is not exists in the
 * point than function returns distance to the planet ellipsoid.
 * @public
 * @param {og.math.Vector2} px
 * @returns {number}
 */
og.scene.Planet.prototype.getDistanceFromPixel = function (px, force) {
    if (this._viewChanged || force) {
        this._viewChanged = false;
        var cnv = this.renderer.handler.canvas;
        var color =
            this.renderer._drawBuffersExtension &&
            og.math.Vector4.fromVec(this.renderer.sceneFramebuffer.readPixel(px.x / cnv.width, (cnv.height - px.y) / cnv.height, 2)) ||
            og.math.Vector4.fromVec(this._heightPickingFramebuffer.readPixel(px.x / cnv.width, (cnv.height - px.y) / cnv.height));
        if (!(color.x | color.y | color.z)) {
            return this._currentDistanceFromPixel = this.getDistanceFromPixelEllipsoid(px);
        }
        color.w = 0.0;
        this._currentDistanceFromPixel = og.math.coder.decodeFloatFromRGBA(color);
        return this._currentDistanceFromPixel;
    }
    return this._currentDistanceFromPixel;
};

/**
 * Sets camera to the planet geographical extent.
 * @public
 * @param {og.Extent} extent - Geographical extent.
 */
og.scene.Planet.prototype.viewExtent = function (extent) {
    this.renderer.activeCamera.viewExtent(extent);
};

/**
 * Sets camera to the planet geographical extent.
 * @public
 * @param {Array.<number,number,number,number>} extentArr - Geographical extent array,
 * where index 0 - southwest longitude, 1 - latitude southwest, 2 - longitude northeast, 3 - latitude northeast.
 */
og.scene.Planet.prototype.viewExtentArr = function (extentArr) {
    this.renderer.activeCamera.viewExtent(
        new og.Extent(new og.LonLat(extentArr[0], extentArr[1]),
            new og.LonLat(extentArr[2], extentArr[3])));
};

/**
 * Gets current viewing geographical extent.
 * @public
 * @returns {og.Extent}
 */
og.scene.Planet.prototype.getViewExtent = function () {
    if (this._viewExtentMerc) {
        var ne = this._viewExtentMerc.northEast.inverseMercator(),
            sw = this._viewExtentMerc.southWest.inverseMercator();
        if (this._viewExtentWGS84) {
            var e = this._viewExtentWGS84;
            if (e.northEast.lon > ne.lon) {
                ne.lon = e.northEast.lon;
            }
            if (e.northEast.lat > ne.lat) {
                ne.lat = e.northEast.lat;
            }
            if (e.southWest.lon < sw.lon) {
                sw.lon = e.southWest.lon;
            }
            if (e.southWest.lat < sw.lat) {
                sw.lat = e.southWest.lat;
            }
        }
        return new og.Extent(sw, ne);
    } else if (this._viewExtentWGS84) {
        return this._viewExtentWGS84;
    }
};

/**
 * Sets camera to the planet geographical position.
 * @public
 * @param {og.LonLat} lonlat - New geographical position.
 * @param {og.math.Vector3} [up] - Camera UP vector.
 */
og.scene.Planet.prototype.viewLonLat = function (lonlat, up) {
    this.renderer.activeCamera.setLonLat(lonlat, up);
};

/**
 * Fly camera to the planet geographical extent.
 * @public
 * @param {og.Extent} extent - Geographical extent.
 * @param {og.math.Vector3} [up] - Camera UP vector on the end of a flying.
 */
og.scene.Planet.prototype.flyExtent = function (extent, up) {
    this.renderer.activeCamera.flyExtent(extent, up);
};

/**
 * Fly camera to the new point.
 * @public
 * @param {og.math.Vector3} cartesian - Fly coordiantes.
 * @param {og.math.Vector3} [look] - Camera "look at" point.
 * @param {og.math.Vector3} [up] - Camera UP vector on the end of a flying.
 */
og.scene.Planet.prototype.flyCartesian = function (cartesian, look, up) {
    this.renderer.activeCamera.flyCartesian(cartesian, look, up);
};

/**
 * Fly camera to the new geographical position.
 * @public
 * @param {og.LonLat} lonlat - Fly geographical coordiantes.
 * @param {og.math.Vector3} [look] - Camera "look at" point on the end of a flying.
 * @param {og.math.Vector3} [up] - Camera UP vector on the end of a flying.
 */
og.scene.Planet.prototype.flyLonLat = function (lonlat, look, up) {
    this.renderer.activeCamera.flyLonLat(lonlat, look, up);
};

/**
 * Breaks the flight.
 * @public
 */
og.scene.Planet.prototype.stopFlying = function () {
    this.renderer.activeCamera.stopFlying();
};

og.scene.Planet.prototype.updateBillboardsTexCoords = function () {
    for (var i = 0; i < this.entityCollections.length; i++) {
        this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
    }

    var readyCollections = {};
    for (var i = 0; i < this.layers.length; i++) {
        var li = this.layers[i];
        if (li instanceof og.layer.Vector) {
            li.each(function (e) {
                if (e._entityCollection && !readyCollections[e._entityCollection.id]) {
                    e._entityCollection.billboardHandler.refreshTexCoordsArr();
                    readyCollections[e._entityCollection.id] = true;
                }
            });
        }
    }
};
