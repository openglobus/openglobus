goog.provide('og.node.Planet');

goog.require('og.inheritance');
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
    og.inheritance.base(this, name);
    this.ellipsoid = ellipsoid;
    this.quadTree;
    this.events = new og.Events();

    this.layers = [];
    this.visibleLayers = [];
    this.tcolorArr = [];
    this.baseLayer;
    this.terrainProvider;

    this.createdNodesCount = 0;
    this.renderedNodes = [];
    this.heightFactor = 1.0;

    this.mousePositionOnEarth = new og.math.Vector3();

    this.indexesBuffers = [];
    this.backbuffer;
    this._currentDistanceFromPixel = 0;
    this._viewChanged = true;
};

og.inheritance.extend(og.node.Planet, og.node.RenderNode);

og.node.Planet.prototype.getLayerByName = function (name) {
    var i = this.layers.length;
    while (i--) {
        if (this.layers[i].name === name)
            return this.layers[i];
    }
    return undefined;
};

/**
 * Adds the given layer to the top of this map.
 * @param {og.layer.Layer} layer Layer.
 */
og.node.Planet.prototype.addLayer = function (layer) {
    layer.planet = this;
    layer.events.on("onvisibilitychanged", this, this._onLayerVisibilityChanged);
    if (layer.isBaseLayer && layer.visibility) {
        this.setBaseLayer(layer);
    }
    this.layers.push(layer);
    this.events.dispatch(this.events.onlayeradded, layer);
    this.updateVisibleLayers();
};

og.node.Planet.prototype._onLayerVisibilityChanged = function (layer) {
    this.events.dispatch(this.events.onlayervisibilitychanged, layer);
};

/**
 * Adds the given layers array to the top of this map.
 * @param {og.layer.Layer} layer Layer.
 */
og.node.Planet.prototype.addLayers = function (layers) {
    for (var i = 0; i < layers.length; i++) {
        this.addLayer(layers[i]);
    }
};

/**
 * Removes the given layer from the map.
 * @param {og.layer.Layer} layer Layer.
 * @return {og.layer.Layer|undefined} The removed layer or undefined if the
 *     layer was not found.
 */
og.node.Planet.prototype.removeLayer = function (layer) {
    var lid = layer.id;
    for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].id == lid) {
            this.layers.splice(i, 1);
            layer.setVisibility(false);
            layer.abortLoading();
            this.quadTree.traverseTree(function (node) {
                var mats = node.planetSegment.materials;
                if (mats[lid]) {
                    mats[lid].clear();
                    mats[lid] = null;
                }
            });
            this.events.dispatch(this.events.onlayerremoved, layer);
            return layer;
        }
    }
    return undefined;
};

/**
 * Get the collection of layers associated with this planet.
 * @return {Array} Layers.
 */
og.node.Planet.prototype.getLayers = function () {
    return this.layers;
};

og.node.Planet.prototype.setBaseLayer = function (layer) {
    if (this.baseLayer) {
        if (layer.id != this.baseLayer.id) {
            for (var i = 0; i < this.layers.length; i++) {
                var li = this.layers[i];
                if (li.isBaseLayer) {
                    li.visibility = false;
                    if (li.id != layer.id)
                        li.events.dispatch(li.events.onvisibilitychanged, li);
                }
            }
            layer.visibility = true;
            layer.events.dispatch(layer.events.onvisibilitychanged, layer);
            this.baseLayer.abortLoading();
            this.baseLayer = layer;
        }
    } else {
        this.baseLayer = layer;
        this.baseLayer.setVisibility(true);
    }
    this.events.dispatch(this.events.onbaselayerchanged, layer);
    this.updateVisibleLayers();
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

    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.single(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.picking(), true);

    this.backbuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.backbuffer.initialize();
    this.updateVisibleLayers();
    this.events.registerNames([
        "ondraw",
        "onlayeradded",
        "onbaselayerchanged",
        "onlayerremoved",
        "onlayervisibilitychanged"
    ]);

    this.renderer.events.on("onresize", this.backbuffer, function (e) {
        this.setSize(e.width, e.height);
    });

    this.renderer.activeCamera.events.on("onviewchanged", this, function (e) {
        this._viewChanged = true;
    });

    this.renderer.events.on("onmousemove", this, function (e) {
        this._viewChanged = true;
    });
};

og.node.Planet.prototype.updateVisibleLayers = function () {
    this.visibleLayers.length = 0;
    for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].visibility) {
            if (this.layers[i].isBaseLayer) {
                this.baseLayer = this.layers[i];
            }
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
    var intersection = this.getRayIntersectionEllipsoid(new og.math.Ray(this.renderer.activeCamera.eye, direction));
    return p.distance(intersection);
};

og.node.Planet.prototype.frame = function () {

    this.quadTree.renderTree();
    this.renderNodesPASS();
    this.renderDistanceBackbufferPASS();

    this.renderer.activeCamera.altitude = this.getAltitude(this.renderer.activeCamera.eye);

    //Here is the planet node dispatche a draw event before clearing.
    this.events.dispatch(this.events.ondraw, this);

    //NOT WORKING! BUG IS HERE!
    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodesPASS = function () {
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

og.node.Planet.prototype.getCartesianFromPixelEllipsoid = function (px) {
    var direction = this.renderer.activeCamera.unproject(px.x, px.y);
    var mxTr = this.transformationMatrix.transpose();
    var sx = new og.math.Ray(mxTr.mulVec3(this.renderer.activeCamera.eye),
        mxTr.mulVec3(direction)).hitSphere(new og.bv.Sphere(this.ellipsoid._a));
    if (sx) {
        return this.itransformationMatrix.mulVec3(sx);
    }
    return null;
};

og.node.Planet.prototype.getLonLatFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    return this.ellipsoid.ECEF2LonLat(coords);
};

og.node.Planet.prototype.getRayIntersectionEllipsoid = function (ray) {
    var mxTr = this.transformationMatrix.transpose();
    var sx = new og.math.Ray(mxTr.mulVec3(ray.origin),
        mxTr.mulVec3(ray.direction)).hitSphere(new og.bv.Sphere(this.ellipsoid._a));
    if (sx) {
        return this.itransformationMatrix.mulVec3(sx);
    }
    return null;
};

og.node.Planet.prototype.getCartesianFromPixelTerrain = function (px) {
    var distance = this.getDistanceFromPixel(px);
    var direction = this.renderer.activeCamera.unproject(px.x, px.y);
    return direction.scaleTo(distance).add(this.renderer.activeCamera.eye);
};

og.node.Planet.prototype.getLonLatFromPixelTerrain = function (px) {
    var coords = this.getCartesianFromPixelTerrain(px);
    return this.ellipsoid.ECEF2LonLat(coords);
};

og.node.Planet.prototype.getPixelFromCartesian = function (coords) {
    return this.renderer.activeCamera.project(coords);
};

og.node.Planet.prototype.getPixelFromLonLat = function (lonlat) {
    var coords = this.ellipsoid.LonLat2ECEF(lonlat);
    if (coords)
        return this.renderer.activeCamera.project(coords);
    return null;
};

og.node.Planet.prototype.getDistanceFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    return coords ? coords.distance(this.renderer.activeCamera.eye) : null;
};

og.node.Planet.prototype.getDistanceFromPixel = function (px) {
    if (this._viewChanged) {
        this._viewChanged = false;
        var color = og.math.Vector4.fromVec(this.backbuffer.readPixels(px.x, this.backbuffer.height - px.y));
        if (!(color.x | color.y | color.z | color.w)) {
            return this.getDistanceFromPixelEllipsoid(px);
        }
        return this._currentDistanceFromPixel = og.math.coder.decodeFloatFromRGBA(color);
    }
    return this._currentDistanceFromPixel;
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
    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.viewToExtent = function (extent) {
    var cam = this.renderer.activeCamera;
    cam.set(cam.getExtentPosition(extent, this.ellipsoid),
        og.math.Vector3.ZERO, og.math.Vector3.UP);
};