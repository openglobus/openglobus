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
    this._projection = og.proj.EPSG4326;
    this._extentMerc = new og.Extent(extent.southWest.forwardMercatorEPS01(), extent.northEast.forwardMercatorEPS01());
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
    res.copy(this.planet.ellipsoid.hitRay(xyz, xyz.negateTo().normalize()));
    return xyz.distance(res);
};

og.planetSegment.SegmentWGS84.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;

    var maxPoleZoom;
    var lat = this._extent.northEast.lat;
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
    var extent = this._extent;

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

    var ext = this._extent;
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
    var e = this._extent;
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

    this._globalTextureCoordinates[0] = (e.southWest.lon + 180.0) / 360.0;
    this._globalTextureCoordinates[1] = (90 - e.northEast.lat) / 180.0;
    this._globalTextureCoordinates[2] = (e.northEast.lon + 180.0) / 360.0;
    this._globalTextureCoordinates[3] = (90 - e.southWest.lat) / 180.0;
};

og.planetSegment.SegmentWGS84.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this._extent;

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

og.planetSegment.SegmentWGS84.prototype._collectRenderNodes = function () {
    if (this._isNorth) {
        this.planet._visibleNodesNorth[this.node.nodeId] = this.node;
    } else {
        this.planet._visibleNodesSouth[this.node.nodeId] = this.node;
    }
};

og.planetSegment.SegmentWGS84.prototype.isEntityInside = function (e) {
    return this._extent.isInside(e._lonlat);
};

og.planetSegment.SegmentWGS84.prototype._getLayerExtentOffset = function (layer) {
    var v0s = layer._extent;
    var v0t = this._extent;
    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};

og.planetSegment.SegmentWGS84.prototype.layerOverlap = function (layer) {
    return this._extent.overlaps(layer._extent);
};

og.planetSegment.SegmentWGS84.prototype._getDefaultTexture = function () {
    return this.planet.solidTextureTwo;
};

og.planetSegment.SegmentWGS84.prototype.getExtentMerc = function () {
    return this._extentMerc;
};