/* class Planet
 *
 *
 *
 *
 */
og.node.Planet = function (ellipsoid) {
    og.node.Planet.superclass.constructor.call(this, "Planet");
    this.ellipsoid = ellipsoid;
    this.quadTree;

    this.layers = [];
    this.baseLayer;
    this.terrainProvider;

    this.mxScale = mat4.create();
    this.mxRotation = mat4.create();
    this.mxTranslation = mat4.create();
    this.mxTransformation = mat4.create();
    this.invMxTransformation = mat4.create();

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
        if (layer.url != this.baseLayer.url) {
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
    this.drawMode = og.webglContext.GL_TRIANGLE_STRIP;
    this.initTransformationToSphere();
    this.getInverseTransformationSphereMatrix();
};

og.node.Planet.prototype.initTransformationToSphere = function () {
    var rx = 1.0;
    var ry = this.ellipsoid._a / this.ellipsoid._b;
    var rz = 1.0;

    this.mxScale.set([rx,  0,  0,   0,
                       0, ry,  0,   0,
                       0,  0, rz,   0,
                       0,  0,  0, 1.0]);

    this.mxRotation.set([1.0,   0,   0,   0,
                           0, 1.0,   0,   0,
                           0,   0, 1.0,   0,
                           0,   0,   0, 1.0]);

    this.mxTranslation.set([1.0,   0,   0,   0,
                              0, 1.0,   0,   0,
                              0,   0, 1.0,   0,
                              0,   0,   0, 1.0]);
};

og.node.Planet.prototype.getInverseTransformationSphereMatrix = function () {
    var mxtr = mat4.create();
    mat4.multiply(this.mxTranslation, this.mxRotation, mxtr);
    mat4.multiply(mxtr, this.mxScale, this.mxTransformation);
    mat4.inverse(this.mxTransformation, this.invMxTransformation);
};

og.node.Planet.prototype.getRayEllipsoidIntersection = function (position, direction) {
    var kpos = vec3.create();
    var kdir = vec3.create();
    var mxTr = mat4.create();

    mat4.transpose(this.mxTransformation, mxTr);

    mat4.multiplyVec3(mxTr, position.toVec(), kpos);
    mat4.multiplyVec3(mxTr, direction.toVec(), kdir);

    var spheroid = new og.bv.Sphere();
    spheroid.center.set(0, 0, 0);
    spheroid.radius = this.ellipsoid._a;
    var nkdir = new og.math.Vector3(kdir[og.math.X], kdir[og.math.Y], kdir[og.math.Z]);

    var sx = spheroid.rayIntersect(new og.math.Vector3(kpos[og.math.X], kpos[og.math.Y], kpos[og.math.Z]), nkdir.normal());
    if (sx) {
        var res = vec3.create();
        mat4.multiplyVec3(this.invMxTransformation, sx.toVec(), res);
        return new og.math.Vector3(res[0], res[1], res[2]);
    } else {
        return null;
    }
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
    var nodes = this.renderedNodes;
    for (var i = 0; i < nodes.length; i++)
    {
        if (nodes[i].planetSegment.refreshIndexesBuffer)
        {
            //...
            nodes[i].planetSegment.createIndexesBuffer(nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize, nodes[i].planetSegment.gridSize);
            //nodes[i].planetSegment.createIndexesBuffer(1, 1, 1, 1);
            //...

            nodes[i].planetSegment.refreshIndexesBuffer = false;
        }

        nodes[i].planetSegment.draw();
    }
};