goog.provide('og.node.Planet');

goog.require('og');
goog.require('og.node.RenderNode');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.math.coder');
goog.require('og.quadTree');
goog.require('og.quadTree.QuadNode');
goog.require('og.bv.Sphere');
goog.require('og.planetSegment');
goog.require('og.shaderProgram.overlays');
goog.require('og.shaderProgram.single');
goog.require('og.shaderProgram.picking');
goog.require('og.layer');
goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.Extent');
goog.require('og.math.Ray');
goog.require('og.webgl.Framebuffer');
goog.require('og.Events');

og.node.Planet = function (name, ellipsoid) {
    og.base(this, name);
    this.ellipsoid = ellipsoid;
    this.quadTree;
    this.events = new og.Events();

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
    this.backbuffer;
};

og.extend(og.node.Planet, og.node.RenderNode);

og.node.Planet.prototype.getLayerByName = function (name) {
    var i = this.layers.length;
    while (i--) {
        if (this.layers[i].name === name)
            return this.layers[i];
    }
    return null;
};

og.node.Planet.prototype.addLayer = function (layer) {
    layer.planet = this;
    this.layers.push(layer);
    this.updateVisibleLayers();
};

og.node.Planet.prototype.addLayers = function (layers) {
    for (var i = 0; i < layers.length; i++) {
        this.addLayer(layers[i]);
    }
};

og.node.Planet.prototype.setBaseLayer = function (layer) {
    if (this.baseLayer) {
        if (layer.id != this.baseLayer.id) {
            for (var i = 0; i < this.layers.length; i++) {
                if (this.layers[i].isBaseLayer) {
                    this.layers[i].visibility = false;
                }
            }
            layer.setVisibility(true);
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

og.node.Planet.prototype.addEvent = function (name, sender, callback) {
    this.events.addEvent(name, sender, callback);
};

og.node.Planet.prototype.initialization = function () {
    //Initialization indexes table
    og.planetSegment.PlanetSegmentHelper.initIndexesTables(5);

    //Iniytialize indexes buffers array
    for (var i = 0; i <= 5; i++) {
        var gridSize = Math.pow(2, i);
        var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gridSize, [gridSize, gridSize, gridSize, gridSize]);
        this.indexesBuffers[gridSize] = this.renderer.handler.createElementArrayBuffer(indexes, 1, indexes.length);
    }

    this.quadTree = og.quadTree.QuadNode.createNode(this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]));
    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    this.setScale(new og.math.Vector3(1.0, this.ellipsoid._a / this.ellipsoid._b, 1.0));
    this.updateMatrices();
    this.loadEmptyTexture(og.RESOURCES_URL + "images/planet/empty.jpg");

    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays);
    this.renderer.handler.addShaderProgram(og.shaderProgram.single);
    this.renderer.handler.addShaderProgram(og.shaderProgram.picking);

    this.backbuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.backbuffer.initialize();
    this.updateVisibleLayers();

    this.events.registerNames([
        "ondraw"
    ]);
};

og.node.Planet.prototype.loadEmptyTexture = function (url) {
    var that = this,
        img = new Image();
    img.onload = function () {
        that.emptyTexture = that.renderer.handler.createTextureFromImage(this);
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
    this.sortVisibleLayersByZIndex();
};

og.node.Planet.prototype.sortVisibleLayersByZIndex = function () {
    this.visibleLayers.sort(function (a, b) {
        return a.isBaseLayer ? -1 : a.zIndex - b.zIndex;
    })
};

og.node.Planet.prototype.getAltitude = function (p) {
    var direction = new og.math.Vector3(-p.x, -p.y, -p.z);
    var intersection = new og.math.Ray(p, direction).hitPlanetEllipsoid(this);
    return p.distance(intersection);
};

og.node.Planet.prototype.frame = function () {

    this.quadTree.renderTree();
    this.renderNodes();

    //re
    var r = this.renderer;
    var cam = r.activeCamera;
    this.mousePositionOnEarth = new og.math.Ray(cam.eye, r.mouseState.direction).hitPlanetEllipsoid(this);
    this.renderer.activeCamera.altitude = this.getAltitude(cam.eye);

    //var ll = this.getLonLatFromPixelTerrain(new og.math.Pixel(this.renderer.mouseState.x, this.renderer.mouseState.y));
    //var distance = 0;
    //print2d("lbCoords", "distance = " + distance + ", latlon = " + ll.lat.toFixed(5) + "," + ll.lon.toFixed(5) + ", height = " + ll.height, 10, 10);

    //Here is the planet node dispatche a draw event before clearing.
    this.events.callEvents(this.events.ondraw, this);

    this.visitedNodesCount = 0;
    this.renderedNodesCount = 0;

    //NOT WORKING! BUG IS HERE!
    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodes = function () {
    var sh, drawCallback;
    var renderer = this.renderer;
    var h = renderer.handler;

    if (this.visibleLayers.length > 1) {
        h.shaderPrograms.overlays.activate();
        sh = h.shaderPrograms.overlays._program;
        drawCallback = og.planetSegment.drawOverlays;
        var layers = this.visibleLayers;
        var i = layers.length;
        while (i--) {
            var ll = layers[i];
            var nt4 = i * 4;
            this.tcolorArr[nt4] = ll.transparentColor[0];
            this.tcolorArr[nt4 + 1] = ll.transparentColor[1];
            this.tcolorArr[nt4 + 2] = ll.transparentColor[2];
            this.tcolorArr[nt4 + 3] = ll.opacity;
        }
        h.gl.uniform1i(sh.uniforms.numTex._pName, layers.length);
        h.gl.uniform4fv(sh.uniforms.tcolorArr._pName, this.tcolorArr);
    } else {
        h.shaderPrograms.single.activate();
        sh = h.shaderPrograms.single._program;
        drawCallback = og.planetSegment.drawSingle;
    }

    h.gl.uniformMatrix4fv(sh.uniforms.uPMVMatrix._pName, false, renderer.activeCamera.pmvMatrix._m);

    var i = this.renderedNodes.length;
    while (i--) {
        drawCallback(sh, this.renderedNodes[i].planetSegment);
    }
};

og.node.Planet.prototype.renderDistanceBackbufferPASS = function () {
    var b = this.backbuffer,
        r = this.renderer;
    var h = r.handler;
    var pp = h.shaderPrograms.picking;
    b.activate();
    b.clear();
    pp.activate();
    h.gl.uniform3fv(pp._program.uniforms.camPos._pName, r.activeCamera.eye.toVec());
    var i = this.renderedNodes.length;
    while (i--) {
        this.renderedNodes[i].planetSegment.drawPicking();
    }
    b.deactivate();
};

og.node.Planet.prototype.getCartesianFromPixelEllipsoid = function (px) {
    var direction = this.renderer.activeCamera.unproject(px.x, px.y);
    var mxTr = this.transformationMatrix.transpose();
    var sx = new og.math.Ray(
        mxTr.mulVec3(this.renderer.activeCamera.eye),
        mxTr.mulVec3(direction))
    .hitSphere(new og.bv.Sphere(this.ellipsoid._a));
    if (sx) {
        return this.itransformationMatrix.mulVec3(sx);
    }
    return null;
};

og.node.Planet.prototype.getLonLatFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    return this.ellipsoid.ECEF2LonLat(coords.z, coords.x, coords.y);
};

og.node.Planet.prototype.getCartesianFromPixelTerrain = function (px) {
    var distance = this.getDistanceFromPixel(px);
    var direction = this.renderer.activeCamera.unproject(px.x, px.y);
    return direction.scaleTo(distance).add(this.renderer.activeCamera.eye);
};

og.node.Planet.prototype.getLonLatFromPixelTerrain = function (px) {
    var coords = this.getCartesianFromPixelTerrain(px);
    return this.ellipsoid.ECEF2LonLat(coords.z, coords.x, coords.y);
};

og.node.Planet.prototype.getPixelFromCartesian = function (coords) {
    return this.renderer.activeCamera.project(coords);
};

og.node.Planet.prototype.getPixelFromLonLat = function (lonlat) {
    var coords = this.ellipsoid.LonLat2ECEF(lonlat);
    return this.renderer.activeCamera.project(coords);
};

og.node.Planet.prototype.getDistanceFromPixel = function (px) {
    this.renderDistanceBackbufferPASS();
    var color = og.math.Vector4.fromVec(this.backbuffer.readPixels(px.x, this.renderer.handler.gl.canvas.height - px.y));
    return og.math.coder.decodeFloatFromRGBA(color);
};
