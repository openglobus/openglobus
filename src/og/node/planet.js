goog.provide('og.node.Planet');

goog.require('og.node.Node3D');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.quadTree');
goog.require('og.quadTree.QuadNode');
goog.require('og.bv.Sphere');

og.node.Planet = function (name, ellipsoid) {
    og.node.Planet.superclass.constructor.call(this, name);
    this.ellipsoid = ellipsoid;
    this.quadTree;

    this.layers = [];
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
    this.heightFactor = 1.47;
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
            this.quadTree.reloadTextures();
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
    this.quadTree = og.quadTree.QuadNode.createNode(this, og.quadTree.NW, null, 0, 0, [-20037508.34, -20037508.34, 20037508.34, 20037508.34]);
    this.drawMode = this.renderer.ctx.gl.TRIANGLE_STRIP;
    this.initTransformationToSphere();
    this.getInverseTransformationSphereMatrix();
    this.loadDefaultTexture("../resources/images/planet/empty.jpg");

};

og.node.Planet.prototype.loadDefaultTexture = function (url) {
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

og.node.Planet.prototype.frame = function () {

    this.quadTree.renderTree();
    this.renderNodes();

    var pos = this.renderer.activeCamera.eye;
    var direction = new og.math.Vector3(-pos.x, -pos.y, -pos.z);
    var intersection = this.getRayEllipsoidIntersection(pos, direction.normal());
    var altitude = pos.distance(intersection);
    this.renderer.activeCamera.altitude = altitude;

    print2d("lbAltitude", "alt: " + this.renderer.activeCamera.altitude + " proj: " + intersection.x.toFixed(12) + " " + intersection.y.toFixed(12) + " " + intersection.z.toFixed(12), 10, 10);
    print2d("lbCounter", "ltc=" + this.baseLayer.counter + ", tqs=" + this.baseLayer.pendingsQueue.length + ", ltrc=" + this.terrainProvider.counter + ", trqs=" + this.terrainProvider.pendingsQueue.length + ", rnc: " + this.renderedNodes.length + ", vnc: " + this.visitedNodesCount + ", cnc: " + this.createdNodesCount, 10, 100);

    this.visitedNodesCount = 0;
    this.renderedNodesCount = 0;

    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodes = function () {

    this.renderer.ctx.shaderPrograms.planet.activate();

    var nodes = this.renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].planetSegment.refreshIndexesBuffer) {
            //...
            nodes[i].planetSegment.createIndexesBuffer(nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize);
            //nodes[i].planetSegment.createIndexesBuffer(1, 1, 1, 1);
            //...

            nodes[i].planetSegment.refreshIndexesBuffer = false;
        }

        nodes[i].planetSegment.draw();
    }
};