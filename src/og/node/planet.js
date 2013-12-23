goog.provide('og.node.Planet');

goog.require('og');
goog.require('og.node.RenderNode');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.quadTree');
goog.require('og.quadTree.QuadNode');
goog.require('og.bv.Sphere');
goog.require('og.planetSegment');
goog.require('og.shaderProgram.overlays');
goog.require('og.shaderProgram.single');
goog.require('og.layer');
goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.Extent');
goog.require('og.math.Ray');

og.node.Planet = function (name, ellipsoid) {
    og.node.Planet.superclass.constructor.call(this, name);
    this.ellipsoid = ellipsoid;
    this.quadTree;

    this.layers = [];
    this.visibleLayers = [];
    this.tcolorArr = new Float32Array(og.layer.MAX_OVERLAYS * 4);
    this.baseLayer;
    this.terrainProvider;
    this.emptyTexture = null;

    this.createdNodesCount = 0;
    this.renderedNodes = [];
    this.heightFactor = 1.0;

    this.mousePositionOnEarth = new og.math.Vector3();

    this.indexesBuffers = [];
};

og._class_.extend(og.node.Planet, og.node.RenderNode);

og.node.Planet.prototype.addLayer = function (layer) {
    this.layers.push(layer);
};

og.node.Planet.prototype.addLayers = function (layers) {
    this.layers.push.apply(this.layers, layers);
};

og.node.Planet.prototype.setBaseLayer = function (layer) {
    if (this.baseLayer) {
        if (layer.id != this.baseLayer.id) {
            for (var i = 0; i < this.layers.length; i++) {
                if (this.layers[i].isBaseLayer) {
                    this.layers[i].visibility = false;
                }
            }
            layer.visibility = true;
            this.baseLayer.abortLoading();
            this.baseLayer = layer;
        }
    } else {
        this.baseLayer = layer;
    }
};

og.node.Planet.prototype.setHeightFactor = function (factor) {
    if (this.heightFactor !== factor) {
        this.heightFactor = factor;
        this.quadTree.reloadTerrain();
    }
};

og.node.Planet.prototype.setTerrainProvider = function (terrain) {
    this.terrainProvider = terrain;
};

og.node.Planet.prototype.removeLayer = function (layer) {
    //...
};

og.node.Planet.prototype.initialization = function () {
    //Initialization indexes table
    og.planetSegment.PlanetSegmentHelper.initIndexesTables(5);

    //Iniytialize indexes buffers array
    for (var i = 0; i <= 5; i++) {
        var gridSize = Math.pow(2, i);
        var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gridSize, [gridSize, gridSize, gridSize, gridSize]);
        this.indexesBuffers[gridSize] = this.renderer.ctx.createElementArrayBuffer(indexes, 1, indexes.length);
    }

    this.quadTree = og.quadTree.QuadNode.createNode(this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]));
    this.drawMode = this.renderer.ctx.gl.TRIANGLE_STRIP;
    this.setScale(new og.math.Vector3(1.0, this.ellipsoid._a / this.ellipsoid._b, 1.0));
    this.updateMatrices();
    this.loadEmptyTexture(og.RESOURCES_URL + "images/planet/empty.jpg");
    this.renderer.ctx.addShaderProgram(og.shaderProgram.overlays);
    this.renderer.ctx.addShaderProgram(og.shaderProgram.single);
};

og.node.Planet.prototype.loadEmptyTexture = function (url) {
    var that = this,
        img = new Image();
    img.onload = function () {
        that.emptyTexture = that.renderer.ctx.createTextureFromImage(this);
    };
    img.src = url;
};

og.node.Planet.prototype.updateVisibleLayers = function () {
    this.visibleLayers.length = 0;
    for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].visibility) {
            this.visibleLayers.push(this.layers[i]);
        }
    }
};

og.node.Planet.prototype.getAltitude = function (p) {
    var direction = new og.math.Vector3(-p.x, -p.y, -p.z);
    var intersection = new og.math.Ray(p, direction).hitPlanetEllipsoid(this);
    return p.distance(intersection);
};

og.node.Planet.prototype.frame = function () {
    this.updateVisibleLayers();

    this.mousePositionOnEarth = new og.math.Ray(this.renderer.activeCamera.eye,
        this.renderer.mouseState.mouseDirection)
        .hitPlanetEllipsoid(this);
    this.renderer.activeCamera.altitude = this.getAltitude(this.renderer.activeCamera.eye);

    this.quadTree.renderTree();
    this.renderNodes();

    this.visitedNodesCount = 0;
    this.renderedNodesCount = 0;

    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodes = function () {
    var sh, drawCallback;
    var renderer = this.renderer;
    var ctx = renderer.ctx;

    if (this.visibleLayers.length > 1) {
        ctx.shaderPrograms.overlays.activate();
        sh = ctx.shaderPrograms.overlays;
        drawCallback = og.planetSegment.drawOverlays;
        var layers = this.visibleLayers;
        for (var l = 0; l < layers.length; l++) {
            var ll = layers[l];
            var nt4 = l * 4;
            this.tcolorArr[nt4] = ll.transparentColor[0];
            this.tcolorArr[nt4 + 1] = ll.transparentColor[1];
            this.tcolorArr[nt4 + 2] = ll.transparentColor[2];
            this.tcolorArr[nt4 + 3] = ll.opacity;
        }
        ctx.gl.uniform1i(sh.uniforms.numTex._pName, layers.length);
        ctx.gl.uniform4fv(sh.uniforms.tcolorArr._pName, this.tcolorArr);
    } else {
        ctx.shaderPrograms.single.activate();
        sh = ctx.shaderPrograms.single;
        drawCallback = og.planetSegment.drawSingle;
    }

    ctx.gl.uniformMatrix4fv(sh.uniforms.uPMVMatrix._pName, false, renderer.activeCamera.pmvMatrix._m);

    var nodes = this.renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        drawCallback(sh, nodes[i].planetSegment);
    }
};