goog.provide('og.node.Planet');

goog.require('og');
goog.require('og.node.Node3D');
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

    this.mxScale = new og.math.Matrix4();
    this.mxRotation = new og.math.Matrix4();
    this.mxTranslation = new og.math.Matrix4();
    this.mxTransformation = new og.math.Matrix4();
    this.invMxTransformation = new og.math.Matrix4();

    this.createdNodesCount = 0;
    this.renderedNodes = [];
    this.heightFactor = 1.0;

    this.mousePositionOnEarth = new og.math.Vector3();

    this.indexesBuffers = [];
};

og._class_.extend(og.node.Planet, og.node.Node3D);

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

    this.quadTree = og.quadTree.QuadNode.createNode(this, og.quadTree.NW, null, 0, 0, [-20037508.34, -20037508.34, 20037508.34, 20037508.34]);
    this.drawMode = this.renderer.ctx.gl.TRIANGLE_STRIP;
    this.initTransformationToSphere();
    this.getInverseTransformationSphereMatrix();
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

og.node.Planet.prototype.initTransformationToSphere = function () {
    var rx = 1.0;
    var ry = this.ellipsoid._a / this.ellipsoid._b;
    var rz = 1.0;

    this.mxScale.set([rx, 0, 0, 0,
                       0, ry, 0, 0,
                       0, 0, rz, 0,
                       0, 0, 0, 1.0]);

    this.mxRotation.set([1.0, 0, 0, 0,
                           0, 1.0, 0, 0,
                           0, 0, 1.0, 0,
                           0, 0, 0, 1.0]);

    this.mxTranslation.set([1.0, 0, 0, 0,
                              0, 1.0, 0, 0,
                              0, 0, 1.0, 0,
                              0, 0, 0, 1.0]);
};

og.node.Planet.prototype.getInverseTransformationSphereMatrix = function () {
    this.mxTransformation = this.mxTranslation.mul(this.mxRotation).mul(this.mxScale);
    this.invMxTransformation = this.mxTransformation.inverse();
};

og.node.Planet.prototype.getRayEllipsoidIntersection = function (position, direction) {
    var mxTr = this.mxTransformation.transpose();
    var spheroid = new og.bv.Sphere();
    spheroid.center.set(0, 0, 0);
    spheroid.radius = this.ellipsoid._a;
    var sx = spheroid.rayIntersect(mxTr.mulVec3(position), mxTr.mulVec3(direction).normalize());
    if (sx) {
        return this.invMxTransformation.mulVec3(sx);
    }
    return null;
};

og.node.Planet.prototype.updateVisibleLayers = function () {
    this.visibleLayers.length = 0;
    for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].visibility) {
            this.visibleLayers.push(this.layers[i]);
        }
    }
};

og.node.Planet.prototype.frame = function () {
    this.updateVisibleLayers();
    this.quadTree.renderTree();
    this.renderNodes();

    var pos = this.renderer.activeCamera.eye;
    var direction = new og.math.Vector3(-pos.x, -pos.y, -pos.z);
    var intersection = this.getRayEllipsoidIntersection(pos, direction.normal());
    var altitude = pos.distance(intersection);
    this.renderer.activeCamera.altitude = altitude;
    this.mousePositionOnEarth = this.getRayEllipsoidIntersection(pos, this.renderer.mouseDirection);

    this.visitedNodesCount = 0;
    this.renderedNodesCount = 0;

    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodes = function () {
    var sh;
    if (this.visibleLayers.length > 1) {
        this.renderer.ctx.shaderPrograms.overlays.activate();
        sh = this.renderer.ctx.shaderPrograms.overlays;
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
        this.renderer.ctx.gl.uniform1i(sh.uniforms.numTex._pName, layers.length);
        this.renderer.ctx.gl.uniform4fv(sh.uniforms.tcolorArr._pName, this.tcolorArr);
    } else {
        this.renderer.ctx.shaderPrograms.single.activate();
        sh = this.renderer.ctx.shaderPrograms.single;
        drawCallback = og.planetSegment.drawSingle;
    }

    this.renderer.ctx.gl.uniformMatrix4fv(sh.uniforms.uPMVMatrix._pName, false, this.renderer.activeCamera.pmvMatrix._m);

    var nodes = this.renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        drawCallback(sh, nodes[i].planetSegment);
    }
};