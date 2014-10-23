goog.provide('og.node.Planet');

goog.require('og.inheritance');
goog.require('og.node.RenderNode');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');
goog.require('og.math.coder');
goog.require('og.quadTree');
goog.require('og.quadTree.QuadNode');
goog.require('og.bv.Sphere');
goog.require('og.PlanetCamera');
goog.require('og.shaderProgram.overlays_wl');
goog.require('og.shaderProgram.overlays_nl');
goog.require('og.shaderProgram.single_nl');
goog.require('og.shaderProgram.single_wl');
goog.require('og.shaderProgram.picking');
goog.require('og.layer');
goog.require('og.planetSegment');
goog.require('og.planetSegment.Wgs84PlanetSegment');
goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.Extent');
goog.require('og.math.Ray');
goog.require('og.webgl.Framebuffer');
goog.require('og.Events');
goog.require('og.mercator');
goog.require('og.proj.EPSG4326');
goog.require('og.ImageCanvas');
goog.require('og.light.PointLight');


og.node.Planet = function (name, ellipsoid) {
    og.inheritance.base(this, name);
    this.ellipsoid = ellipsoid;
    this.quadTree;
    this.quadTreeNorth;
    this.quadTreeSouth;
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
    this.cameraInsideNode = null;
    this.cameraPosition_merc;

    this.emptyTexture = null;
    this.transparentTexture = null;
    this.defaultTexture = null;

    this.sunlight = null;
};

og.node.Planet.SUN_DISTANCE = 149600000000;

og.inheritance.extend(og.node.Planet, og.node.RenderNode);

og.node.Planet.defaultEmptyColor = "#C5C5C5";

og.node.Planet.prototype.createDefaultTexture = function (params) {
    var imgCnv;
    var texture;
    if (params && params.color) {
        imgCnv = new og.ImageCanvas(2, 2);
        imgCnv.fillColor(params.color);
        texture = this.renderer.handler.createTextureFromImage(imgCnv.getImage());
    } else if (params && params.url) {
        imgCnv = new og.ImageCanvas(params.width || 256, params.height || 256);
        var that = this;
        imgCnv.loadImage(params.url, function (img) {
            texture = that.renderer.handler.createTextureFromImage(img);
            texture.default = true;
        });
    } else {
        imgCnv = new og.ImageCanvas(2, 2);
        imgCnv.fillColor(og.node.Planet.defaultEmptyColor);
        texture = this.renderer.handler.createTextureFromImage(imgCnv.getImage());
    }
    texture.default = true;
    return texture;
};

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
    og.planetSegment.PlanetSegmentHelper.initIndexesTables(6);

    //Iniytialize indexes buffers array
    for (var i = 0; i <= 6; i++) {
        var gridSize = Math.pow(2, i);
        var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gridSize, [gridSize, gridSize, gridSize, gridSize]);
        this.indexesBuffers[gridSize] = this.renderer.handler.createElementArrayBuffer(indexes, 1, indexes.length);
    }

    //create empty textures
    this.solidTexture = this.createDefaultTexture({ color: "rgba(197,197,197,1.0)" });
    this.transparentTexture = this.createDefaultTexture({ color: "rgba(0,0,0,0.0)" });

    this.renderer.activeCamera = new og.PlanetCamera(this.renderer, this.ellipsoid, { eye: new og.math.Vector3(0, 0, 12000000), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });

    //Creating quad trees nodes
    this.quadTree = og.quadTree.QuadNode.createNode(og.planetSegment.PlanetSegment, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]));
    this.quadTreeNorth = og.quadTree.QuadNode.createNode(og.planetSegment.Wgs84PlanetSegment, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-180, og.mercator.MAX_LAT, 180, 90]));
    this.quadTreeSouth = og.quadTree.QuadNode.createNode(og.planetSegment.Wgs84PlanetSegment, this, og.quadTree.NW, null, 0, 0, og.Extent.createFromArray([-180, -90, 180, og.mercator.MIN_LAT]));

    //Just initials
    this.cameraInsideNode = this.quadTree;
    var cam = this.renderer.activeCamera;
    this.cameraPosition_merc = cam.lonLat.forwardMercator();
    this.drawMode = this.renderer.handler.gl.TRIANGLE_STRIP;
    this.setScale(new og.math.Vector3(1.0, this.ellipsoid._a / this.ellipsoid._b, 1.0));
    this.updateMatrices();

    //Applying shaders
    this.renderer.handler.addShaderProgram(og.shaderProgram.single_nl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.single_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays_nl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.overlays_wl(), true);
    this.renderer.handler.addShaderProgram(og.shaderProgram.picking(), true);

    //backbuffer initialization
    this.backbuffer = new og.webgl.Framebuffer(this.renderer.handler.gl);
    this.backbuffer.initialize();

    this.updateVisibleLayers();

    //events initialization
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

    this.sunlight = new og.light.PointLight();
    this.sunlight._position.z = og.node.Planet.SUN_DISTANCE;
    this.sunlight.setAmbient(new og.math.Vector3(0.14, 0.1, 0.2));
    this.sunlight.setDiffuse(new og.math.Vector3(0.9, 0.9, 0.8));
    this.sunlight.setSpecular(new og.math.Vector3(0.01, 0.01, 0.009));
    this.sunlight.setShininess(8);
    this.sunlight.addTo(this);
};

og.node.Planet.prototype.clearAttributionsList = function () {

}

og.node.Planet.prototype.updateAttributionsList = function () {
    var html = "";
    for (var i = 0; i < this.layers.length; i++) {
        var li = this.layers[i];
        if (li.visibility) {
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

og.node.Planet.prototype.updateVisibleLayers = function () {
    this.visibleLayers.length = 0;
    var html = "";
    for (var i = 0; i < this.layers.length; i++) {
        var li = this.layers[i];
        if (li.visibility) {
            if (li.isBaseLayer) {
                this.baseLayer = li;
            }
            this.visibleLayers.push(li);
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

    this.sortVisibleLayersByZIndex();
};

og.node.Planet.prototype.sortVisibleLayersByZIndex = function () {
    this.visibleLayers.sort(function (a, b) {
        return a.isBaseLayer ? -1 : a.zIndex - b.zIndex;
    })
};

og.node.Planet.prototype.checkCameraCollision = function () {
    var cam = this.renderer.activeCamera;
    if (cam.lonLat.height < 1000000) {
        var seg = this.cameraInsideNode.planetSegment;
        if (seg._projection.id == og.proj.EPSG4326.id) {
            cam.earthPoint.earth = this.hitRayEllipsoid(cam.eye, cam.eye.getNegate().normalize());
            cam.earthPoint.distance = cam.altitude = cam.lonLat.height;
        } else {
            cam.earthPoint = seg.getEarthPoint(this._nodeCameraPosition, cam);
            cam.altitude = cam.earthPoint.distance;
        }
        if (cam.altitude < cam.minAlt) {
            cam.setAltitude(cam.minAlt);
        }
    } else {
        cam.altitude = cam.lonLat.height;
    }
};

og.node.Planet.prototype.frame = function () {

    this.checkCameraCollision();
    this.quadTreeNorth.renderTree();
    this.quadTreeSouth.renderTree();
    this.quadTree.renderTree();
    this.renderNodesPASS();
    this.renderDistanceBackbufferPASS();

   // var b = this.renderer.activeCamera.n.scaleTo(10000).add(this.renderer.activeCamera.eye)
    //this.sunlight._position = this.renderer.activeCamera.eye; //b.add(b.normal().scale(100000));

    //Here is the planet node dispatches a draw event before clearing.
    this.events.dispatch(this.events.ondraw, this);

    //NOT WORKING! BUG IS HERE!
    if (this.createdNodesCount > 140) {
        this.quadTree.clearTree();
        this.quadTreeNorth.clearTree();
        this.quadTreeSouth.clearTree();
        this.createdNodesCount = 0;
    }

    this.renderedNodes.length = 0;
};

og.node.Planet.prototype.renderNodesPASS = function () {
    var sh, drawCallback;
    var renderer = this.renderer;
    var h = renderer.handler;
    var gl = h.gl;

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (this.visibleLayers.length > 1) {

        drawCallback = og.planetSegment.drawOverlays;

        if (this.lightEnabled) {
            h.shaderPrograms.overlays_wl.activate();
            sh = h.shaderPrograms.overlays_wl._program;

            gl.uniform3fv(shu.pointLightsPositions._pName, rn._pointLightsTransformedPositions);
            gl.uniform3fv(shu.pointLightsParamsv._pName, rn._pointLightsParamsv);
            gl.uniform1fv(shu.pointLightsParamsf._pName, rn._pointLightsParamsf);

            gl.uniformMatrix4fv(sh.uniforms.uNMatrix._pName, false, renderer.activeCamera.nMatrix._m);
            gl.uniformMatrix4fv(sh.uniforms.uMVMatrix._pName, false, renderer.activeCamera.mvMatrix._m);
            gl.uniformMatrix4fv(sh.uniforms.uPMatrix._pName, false, renderer.activeCamera.pMatrix._m);
            //h.gl.uniformMatrix4fv(sh.uniforms.uTRSMatrix._pName, false, this.transformationMatrix._m);

        } else {
            h.shaderPrograms.overlays_nl.activate();
            sh = h.shaderPrograms.overlays_nl._program;

            gl.uniformMatrix4fv(sh.uniforms.uPMVMatrix._pName, false, renderer.activeCamera.pmvMatrix._m);
        }

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

        gl.uniform1i(sh.uniforms.numTex._pName, layers.length);
        gl.uniform4fv(sh.uniforms.tcolorArr._pName, this.tcolorArr);

    } else {

        drawCallback = og.planetSegment.drawSingle;

        if (this.lightEnabled) {
            h.shaderPrograms.single_wl.activate();
            sh = h.shaderPrograms.single_wl._program;

            gl.uniform3fv(sh.uniforms.pointLightsPositions._pName, this._pointLightsTransformedPositions);
            gl.uniform3fv(sh.uniforms.pointLightsParamsv._pName, this._pointLightsParamsv);
            gl.uniform1fv(sh.uniforms.pointLightsParamsf._pName, this._pointLightsParamsf);

            gl.uniformMatrix3fv(sh.uniforms.uNMatrix._pName, false, renderer.activeCamera.nMatrix._m);
            gl.uniformMatrix4fv(sh.uniforms.uMVMatrix._pName, false, renderer.activeCamera.mvMatrix._m);
            gl.uniformMatrix4fv(sh.uniforms.uPMatrix._pName, false, renderer.activeCamera.pMatrix._m);
            //h.gl.uniformMatrix4fv(sh.uniforms.uTRSMatrix._pName, false, this.transformationMatrix._m);
        } else {
            h.shaderPrograms.single_nl.activate();
            sh = h.shaderPrograms.single_nl._program;

            gl.uniformMatrix4fv(sh.uniforms.uPMVMatrix._pName, false, renderer.activeCamera.pmvMatrix._m);
        }
    }

    var i = this.renderedNodes.length;
    while (i--) {
        drawCallback(sh, this.renderedNodes[i].planetSegment);
    }
    gl.disable(gl.BLEND);
};

og.node.Planet.prototype.hitRayEllipsoid = function (origin, direction) {
    var mxTr = this.transformationMatrix.transpose();
    var sx = new og.math.Ray(mxTr.mulVec3(origin),
        mxTr.mulVec3(direction)).hitSphere(new og.bv.Sphere(this.ellipsoid._a));
    if (sx) {
        return this.itransformationMatrix.mulVec3(sx);
    }
    return null;
};

og.node.Planet.prototype.getCartesianFromPixelEllipsoid = function (px) {
    var cam = this.renderer.activeCamera;
    return this.hitRayEllipsoid(cam.eye, cam.unproject(px.x, px.y));
};

og.node.Planet.prototype.getLonLatFromPixelEllipsoid = function (px) {
    var coords = this.getCartesianFromPixelEllipsoid(px);
    if (coords) {
        return this.ellipsoid.ECEF2LonLat(coords);
    }
    return null;
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

og.node.Planet.prototype.getCartesianFromMouseTerrain = function () {
    var ms = this.renderer.events.mouseState;
    var distance = this.getDistanceFromPixel(ms);
    if (distance) {
        return ms.direction.scaleTo(distance).add(this.renderer.activeCamera.eye);
    }
    return null;
};

og.node.Planet.prototype.getCartesianFromPixelTerrain = function (px) {
    var distance = this.getDistanceFromPixel(px);
    if (distance) {
        var direction = this.renderer.activeCamera.unproject(px.x, px.y);
        return direction.scaleTo(distance).add(this.renderer.activeCamera.eye);
    }
    return null;
};

og.node.Planet.prototype.getLonLatFromPixelTerrain = function (px) {
    var coords = this.getCartesianFromPixelTerrain(px);
    if (coords) {
        return this.ellipsoid.ECEF2LonLat(coords);
    }
    return null;
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
        var color = og.math.Vector4.fromVec(this.backbuffer.readPixel(px.x, this.backbuffer.height - px.y));
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
    h.gl.disable(h.gl.BLEND);
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