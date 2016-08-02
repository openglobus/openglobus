goog.provide('og.planetSegment.SegmentWGS84');

goog.require('og.planetSegment.Segment');
goog.require('og.inheritance');
goog.require('og.LonLat');
goog.require('og.proj.EPSG4326');

/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 * @extends {og.planetSegment.Segment} 
 */
og.planetSegment.SegmentWGS84 = function (node, planet, tileZoom, extent) {
    this._isNorth = false;

    og.inheritance.base(this, node, planet, tileZoom, extent);

    this.wgs84extent = extent;
    this._projection = og.proj.EPSG4326;
};

og.planetSegment.SegmentWGS84._heightLat = 90.0 - og.mercator.MAX_LAT;
og.planetSegment.SegmentWGS84._maxPoleZoom = 7;
og.planetSegment.SegmentWGS84._pieceSize = og.planetSegment.SegmentWGS84._heightLat / Math.pow(2, og.planetSegment.SegmentWGS84._maxPoleZoom);
og.planetSegment.SegmentWGS84.RATIO_LOD = 1.12;


og.inheritance.extend(og.planetSegment.SegmentWGS84, og.planetSegment.Segment);

og.planetSegment.SegmentWGS84.prototype.projectNative = function (coords) {
    return coords;
};

og.planetSegment.SegmentWGS84.prototype.getTerrainPoint = function (res, xyz) {
    res.copy(this.planet.hitRayEllipsoid(xyz, xyz.negateTo().normalize()));
    return xyz.distance(res);
};

og.planetSegment.SegmentWGS84.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;

    var maxPoleZoom;
    var lat = this.extent.northEast.lat;
    if (lat > 0) {
        //north pole limits
        var Yz = Math.floor((90.0 - lat) / og.planetSegment.SegmentWGS84._pieceSize);
        maxPoleZoom = Math.floor(Yz / 16) + 7;
    } else {
        //south pole limits
        var Yz = Math.floor((og.mercator.MIN_LAT - lat) / og.planetSegment.SegmentWGS84._pieceSize);
        maxPoleZoom = 12 - Math.floor(Yz / 16);
    }

    return camera.projectedSize(sphere.center) > og.planetSegment.SegmentWGS84.RATIO_LOD * sphere.radius ||
        this.tileZoom > maxPoleZoom;
};

og.planetSegment.SegmentWGS84.prototype._assignTileIndexes = function () {
    var tileZoom = this.tileZoom;
    var extent = this.extent;

    this.tileX = Math.round(Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));

    var lat = extent.northEast.lat;
    if (lat > 0) {
        //north pole
        this._isNorth = true;
        this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));
    } else {
        //south pole
        this.tileY = Math.round((og.mercator.MIN_LAT - lat) / (extent.northEast.lat - extent.southWest.lat));
    }
};

og.planetSegment.SegmentWGS84.prototype._addViewExtent = function () {

    var ext = this.extent;
    if (!this.planet._viewExtentWGS84) {
        this.planet._viewExtentWGS84 = new og.Extent(
            new og.LonLat(ext.southWest.lon, ext.southWest.lat),
            new og.LonLat(ext.northEast.lon, ext.northEast.lat));
        return;
    }

    var viewExt = this.planet._viewExtentWGS84;

    if (ext.southWest.lon < viewExt.southWest.lon) {
        viewExt.southWest.lon = ext.southWest.lon;
    }

    if (ext.northEast.lon > viewExt.northEast.lon) {
        viewExt.northEast.lon = ext.northEast.lon;
    }

    if (ext.southWest.lat < viewExt.southWest.lat) {
        viewExt.southWest.lat = ext.southWest.lat;
    }

    if (ext.northEast.lat > viewExt.northEast.lat) {
        viewExt.northEast.lat = ext.northEast.lat;
    }
};

og.planetSegment.SegmentWGS84.prototype.createPlainVertices = function (gridSize) {
    var ind = 0;
    var e = this.extent;
    var lonSize = e.getWidth();
    var latSize = e.getHeight();
    var llStep = lonSize / gridSize;
    var ltStep = latSize / gridSize;
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;

    var r2 = this.planet.ellipsoid._invRadii2;

    this.plainNormals = new Float32Array((gridSize + 1) * (gridSize + 1) * 3);

    var norms = this.plainNormals;
    var verts = this.plainVertices;

    for (var i = 0; i <= gridSize; i++) {
        for (var j = 0; j <= gridSize; j++) {
            var v = this.planet.ellipsoid.lonLatToCartesian(new og.LonLat(esw_lon + j * llStep, ene_lat - i * ltStep));
            var nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
            var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            verts[ind] = v.x;
            norms[ind++] = nx * l;

            verts[ind] = v.y;
            norms[ind++] = ny * l;

            verts[ind] = v.z;
            norms[ind++] = nz * l;
        }
    }
    this.normalMapVertices = verts;
    this.normalMapNormals = norms;
    this.normalMapTexture = this.planet.transparentTexture;
    this.terrainVertices = verts;
    this.tempVertices = verts;

    this._globalTextureCoordinates[0] = (e.southWest.lon + 180.0) / 360;
    this._globalTextureCoordinates[1] = (90 - e.northEast.lat) / 180;
    this._globalTextureCoordinates[2] = (e.northEast.lon + 180.0) / 360;
    this._globalTextureCoordinates[3] = (90 - e.southWest.lat) / 180;
};

og.planetSegment.SegmentWGS84.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this.extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;

    var v = [new og.LonLat(extent.southWest.lon, extent.southWest.lat),
        new og.LonLat(extent.southWest.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.southWest.lat)];

    for (var i = 0; i < v.length; i++) {
        var coord = ellipsoid.lonLatToCartesian(v[i]);
        var x = coord.x, y = coord.y, z = coord.z;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
};

//og.planetSegment.SegmentWGS84.prototype.drawGeoImage = function (geoImage) {
//    if (geoImage.visibility && geoImage.imageLoaded && geoImage._wgs84Extent.intersects(this.extent)) {
//        var tc = this.planet.geoImageTileCreator;
//        var h = tc._handler;
//        var sh = h.shaderPrograms.geoImage._program;
//        var sha = sh.attributes,
//            shu = sh.uniforms;
//        var gl = h.gl;

//        h.shaderPrograms.geoImage.activate();
//        gl.bindBuffer(gl.ARRAY_BUFFER, tc._texCoordsBuffer);
//        gl.vertexAttribPointer(sha.a_texCoord._pName, tc._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
//        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._wgs84CornersBuffer);
//        gl.vertexAttribPointer(sha.a_corner._pName, geoImage._wgs84CornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
//        gl.uniform4fv(shu.u_extentParams._pName, this._extentParams);
//        gl.uniform1f(shu.u_opacity._pName, geoImage.opacity);
//        gl.activeTexture(gl.TEXTURE0);
//        gl.bindTexture(gl.TEXTURE_2D, geoImage._wgs84SourceTexture);
//        gl.uniform1i(shu.u_sourceImage._pName, 0);
//        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//        return true;
//    }
//};

og.planetSegment.SegmentWGS84.prototype._collectRenderNodes = function () {
    if (this._isNorth) {
        this.planet._visibleNodesNorth[this.node.nodeId] = this.node;
    } else {
        this.planet._visibleNodesSouth[this.node.nodeId] = this.node;
    }
};

og.planetSegment.SegmentWGS84.prototype.isEntityInside = function (e) {
    return this.extent.isInside(e._lonlat);
};
