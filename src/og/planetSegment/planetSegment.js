goog.provide('og.planetSegment');
goog.provide('og.planetSegment.PlanetSegment');

goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.layer');
goog.require('og.extent');
goog.require('og.bv.Box');
goog.require('og.bv.Sphere');
goog.require('og.geo');

og.planetSegment.PlanetSegment = function () {
    this.plainVertices = [];
    this.terrainVertices = [];
    this.bbox = new og.bv.Box();
    this.bsphere = new og.bv.Sphere();

    this.vertexPositionBuffer;
    this.vertexIndexBuffer;
    this.vertexTextureCoordBuffer;

    this.extent = [];
    this.gridSize;

    this.zoomIndex;
    this.tileX;
    this.tileY;

    this.planet;
    this._ctx = null;

    this.ready = false;

    this.materials = [];

    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.refreshIndexesBuffer = false;

    this.texBiasArr = new Float32Array(og.layer.MAX_OVERLAYS * 3);
    this.samplerArr = new Int32Array(og.layer.MAX_OVERLAYS);
    this.alfaArr = new Float32Array(og.layer.MAX_OVERLAYS);

    this.node;
};

og.planetSegment.PlanetSegment.prototype.terrainNotExists = function () {
    this.terrainReady = false;
    if (this.ready && this.terrainIsLoading) {
        this.terrainIsLoading = false;
        this.terrainReady = true;
        this.node.appliedTerrainNodeId = this.node.nodeId;
        this.gridSize = this.planet.terrainProvider.gridSizeByZoom[this.zoomIndex];

        this.bsphere.setFromExtent(this.planet.ellipsoid, this.extent);
        this.bbox.setFromExtent(this.planet.ellipsoid, this.extent);

        this.deleteBuffers();

        if (this.zoomIndex > 5) {
            this.createCoordsBuffers(og.planetSegment.PlanetSegment.getCornersVertices(this.terrainVertices, this.gridSize), 2);
            this.gridSize = 2;
            this.refreshIndexesBuffer = false;
        } else {
            this.createCoordsBuffers(this.terrainVertices, this.gridSize);
            this.refreshIndexesBuffer = true;
        }
    }
};

og.planetSegment.PlanetSegment.getCornersVertices = function (v, gridSize) {
    var step = 3 * gridSize;
    var step2 = step * 0.5;
    var lb = step * (gridSize + 1);
    var ml = step2 * (gridSize + 1);
    return [v[0], v[1], v[2], v[step2], v[step2 + 1], v[step2 + 2], v[step], v[step + 1], v[step + 2],
            v[ml], v[ml + 1], v[ml + 2], v[ml + step2], v[ml + step2 + 1], v[ml + step2 + 2], v[ml + step], v[ml + step + 1], v[ml + step + 2],
            v[lb], v[lb + 1], v[lb + 2], v[lb + step2], v[lb + step2 + 1], v[lb + step2 + 2], v[lb + step], v[lb + step + 1], v[lb + step + 2]];
};


og.planetSegment.PlanetSegment.prototype.loadTerrain = function () {
    if (this.zoomIndex >= this.planet.terrainProvider.minZoom) {
        if (this.zoomIndex <= this.planet.terrainProvider.maxZoom) {
            if (!this.terrainIsLoading && !this.terrainReady) {
                this.terrainReady = false;
                this.terrainIsLoading = true;
                this.planet.terrainProvider.handleSegmentTerrain(this);
            }
        }
    } else {
        this.terrainReady = true;
    }
};

og.planetSegment.PlanetSegment.prototype.applyTerrain = function (elevations) {
    if (this.ready && this.terrainIsLoading) {
        var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
        this.gridSize = this.planet.terrainProvider.gridSizeByZoom[this.zoomIndex];
        var fileGridSize = this.planet.terrainProvider.fileGridSize;
        var step = (fileGridSize - 1) / this.gridSize;

        for (var i = 0, iv = 0; i < fileGridSize; i += step, iv++) {
            for (var j = 0, jv = 0; j < fileGridSize; j += step, jv++) {
                var vInd = (iv * (this.gridSize + 1) + jv) * 3;
                var v0 = new og.math.Vector3(this.plainVertices[vInd], this.plainVertices[vInd + 1], this.plainVertices[vInd + 2]);
                var v0_len = v0.length();
                v0.scale((v0_len + this.planet.heightFactor * elevations[i * fileGridSize + j] * 0.001) / v0_len);

                this.terrainVertices[vInd] = v0.x;
                this.terrainVertices[vInd + 1] = v0.y;
                this.terrainVertices[vInd + 2] = v0.z;

                if (v0.x < xmin) xmin = v0.x; if (v0.x > xmax) xmax = v0.x;
                if (v0.y < ymin) ymin = v0.y; if (v0.y > ymax) ymax = v0.y;
                if (v0.z < zmin) zmin = v0.z; if (v0.z > zmax) zmax = v0.z;
            }
        }

        this.bbox.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
        this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);

        this.deleteBuffers();
        this.createCoordsBuffers(this.terrainVertices, this.gridSize);
        this.refreshIndexesBuffer = true;

        elevations.length = 0;

        this.terrainReady = true;
        this.terrainIsLoading = false;

        this.node.appliedTerrainNodeId = this.node.nodeId;
    }
};

og.planetSegment.PlanetSegment.prototype.deleteBuffers = function () {
    this._ctx.gl.deleteBuffer(this.vertexPositionBuffer);
    this._ctx.gl.deleteBuffer(this.vertexIndexBuffer);
    this._ctx.gl.deleteBuffer(this.vertexTextureCoordBuffer);
};

og.planetSegment.PlanetSegment.prototype.clearBuffers = function () {
    this.ready = false;
    this.deleteBuffers();
};

og.planetSegment.PlanetSegment.prototype.deleteElevations = function () {
    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.terrainVertices.length = 0;
    this.plainVertices.length = 0;
};

og.planetSegment.PlanetSegment.prototype.clearSegment = function () {
    this.clearBuffers();

    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        var mi = m[i];
        if (mi) {
            mi.clear();
        }
    }

    this.deleteElevations();
};


og.planetSegment.PlanetSegment.prototype.destroySegment = function () {
    this.clearSegment();
    this.extent.length = 0;
};

og.planetSegment.PlanetSegment.prototype.createCoordsBuffers = function (vertices, gridSize) {
    var gsgs = (gridSize + 1) * (gridSize + 1);
    this.vertexTextureCoordBuffer = this._ctx.createArrayBuffer(new Float32Array(og.planetSegment.PlanetSegmentHelper.textureCoordsTable[gridSize]), 2, gsgs);
    this.vertexPositionBuffer = this._ctx.createArrayBuffer(new Float32Array(vertices), 3, gsgs);
};

og.planetSegment.PlanetSegment.prototype.createIndexesBuffer = function (sidesSizes, gridSize) {
    var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gridSize, sidesSizes);
    this.vertexIndexBuffer = this._ctx.createElementArrayBuffer(indexes, 1, indexes.length);
};

og.planetSegment.PlanetSegment.prototype.assignTileIndexes = function (zoomIndex, extent) {
    this.zoomIndex = zoomIndex;
    this.extent = extent;
    var gr = og.geo.inverseMercator(extent[og.extent.LEFT] + (extent[og.extent.RIGHT] - extent[og.extent.LEFT]) / 2, extent[og.extent.BOTTOM] + (extent[og.extent.TOP] - extent[og.extent.BOTTOM]) / 2);
    var tile = og.layer.lonlat2tile(gr[og.geo.LON], gr[og.geo.LAT], zoomIndex);
    this.tileX = tile[og.math.X];
    this.tileY = tile[og.math.Y];
};

og.planetSegment.PlanetSegment.prototype.createPlainVertices = function (gridSize) {
    this.plainVertices.length = 0;
    var lonSize = this.extent[og.extent.RIGHT] - this.extent[og.extent.LEFT];
    var llStep = lonSize / gridSize;
    for (var i = 0; i <= gridSize; i++) {
        for (var j = 0; j <= gridSize; j++) {
            var gr = og.geo.inverseMercator(this.extent[og.extent.LEFT] + j * llStep, this.extent[og.extent.TOP] - i * llStep);
            var v = this.planet.ellipsoid.LatLon2ECEF(gr[og.geo.LAT], gr[og.geo.LON], 0);
            this.plainVertices.push(v[og.math.Y], v[og.math.Z], v[og.math.X]);
        }
    }
};

og.planetSegment.drawSingle = function (sh, segment) {
    if (segment.ready) {
        var gl = segment._ctx.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleLayers;

        var baseMat = segment.materials[layers[0].id];
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, baseMat.texture);
        gl.uniform3fv(shu.texBias._pName, baseMat.texBias);
        gl.uniform1i(shu.uSampler._pName, 0);

        segment.draw(sh);
    }
};

og.planetSegment.drawOverlays = function (sh, segment) {
    if (segment.ready) {
        var gl = segment._ctx.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleLayers;

        for (var l = 0; l < layers.length; l++) {
            var ll = layers[l];
            var mat = segment.materials[ll.id];
            var nt3 = l * 3;
            var nt4 = l * 4;

            segment.texBiasArr[nt3] = mat.texBias[0];
            segment.texBiasArr[nt3 + 1] = mat.texBias[1];
            segment.texBiasArr[nt3 + 2] = mat.texBias[2];

            segment.samplerArr[l] = l;

            gl.activeTexture(gl.TEXTURE0 + sh._textureID + l);
            gl.bindTexture(gl.TEXTURE_2D, mat.texture);
        }

        gl.uniform3fv(shu.texBiasArr._pName, segment.texBiasArr);
        gl.uniform1iv(shu.uSamplerArr._pName, segment.samplerArr);

        segment.draw(sh);
    }
};

og.planetSegment.PlanetSegment.prototype.draw = function (sh) {
    var gl = this._ctx.gl;
    var sha = sh.attributes;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);


    if ((this.node.sideSize[og.quadTree.N] & this.node.sideSize[og.quadTree.W] &
        this.node.sideSize[og.quadTree.S] & this.node.sideSize[og.quadTree.E] ) == this.gridSize) {
        sh.drawIndexBuffer(this.planet.drawMode, this.planet.indexesBuffers[this.gridSize]);
    } else {
        this.createIndexesBuffer(this.node.sideSize, this.gridSize);
        sh.drawIndexBuffer(this.planet.drawMode, this.vertexIndexBuffer);
    }

    this.node.sideSize = [this.gridSize, this.gridSize, this.gridSize, this.gridSize];
    this.node.hasNeighbor.length = 0;
};