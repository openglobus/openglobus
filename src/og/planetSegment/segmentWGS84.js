goog.provide('og.planetSegment.SegmentWGS84');

goog.require('og.planetSegment.Segment');
goog.require('og.inheritance');
goog.require('og.LonLat');
goog.require('og.proj.EPSG4326');

og.planetSegment.SegmentWGS84 = function () {
    og.inheritance.base(this);

    this._projection = og.proj.EPSG4326;
};

og.planetSegment.SegmentWGS84._heightLat = 90.0 - og.mercator.MAX_LAT;
og.planetSegment.SegmentWGS84._maxPoleZoom = 7;
og.planetSegment.SegmentWGS84._pieceSize = og.planetSegment.SegmentWGS84._heightLat / Math.pow(2, og.planetSegment.SegmentWGS84._maxPoleZoom);


og.inheritance.extend(og.planetSegment.SegmentWGS84, og.planetSegment.Segment);

og.planetSegment.SegmentWGS84.RATIO_LOD = 1.12;

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

og.planetSegment.SegmentWGS84.prototype.assignTileIndexes = function (tileZoom, extent) {
    this.tileZoom = tileZoom;
    this.extent = extent;
    this.wgs84extent = extent;

    this.tileX = Math.round(Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));

    var lat = extent.northEast.lat;
    if (lat > 0) {
        //north pole
        this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));
    } else {
        //south pole
        this.tileY = Math.round((og.mercator.MIN_LAT - lat) / (extent.northEast.lat - extent.southWest.lat));
    }

    this.extentParams = [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()];
};

og.planetSegment.SegmentWGS84.prototype.createPlainVertices = function (gridSize) {
    var verts = this.plainVertices;
    var norms = this.plainNormals;
    var ind = 0;
    var e = this.extent;
    var lonSize = e.getWidth();
    var latSize = e.getHeight();
    var llStep = lonSize / gridSize;
    var ltStep = latSize / gridSize;
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;

    var r2 = this.planet.ellipsoid._invRadii2;

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
};

og.planetSegment.SegmentWGS84.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this.extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(new og.LonLat(extent.southWest.lon, extent.southWest.lat),
        new og.LonLat(extent.southWest.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.southWest.lat));

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

og.planetSegment.SegmentWGS84.prototype.drawGeoImage = function (geoImage) {
    if (geoImage.visibility && geoImage.imageLoaded && geoImage._wgs84Extent.intersects(this.extent)) {
        var tc = this.planet.geoImageTileCreator;
        var h = tc._handler;
        var sh = h.shaderPrograms.geoImage._program;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var gl = h.gl;

        h.shaderPrograms.geoImage.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, tc._texCoordsBuffer);
        gl.vertexAttribPointer(sha.a_texCoord._pName, tc._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._wgs84CornersBuffer);
        gl.vertexAttribPointer(sha.a_corner._pName, geoImage._wgs84CornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.u_extentParams._pName, this.extentParams);
        gl.uniform1f(shu.u_opacity._pName, geoImage.opacity);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._wgs84SourceTexture);
        gl.uniform1i(shu.u_sourceImage._pName, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
    }
};
