goog.provide('og.planetSegment.Wgs84PlanetSegment');

goog.require('og.planetSegment.PlanetSegment');
goog.require('og.inheritance');
goog.require('og.LonLat');
goog.require('og.proj.EPSG4326');

og.planetSegment.Wgs84PlanetSegment = function () {
    og.inheritance.base(this);

    this._projection = og.proj.EPSG4326;
};

og.planetSegment.Wgs84PlanetSegment._heightLat = 90.0 - og.mercator.MAX_LAT;
og.planetSegment.Wgs84PlanetSegment._maxPoleZoom = 7;
og.planetSegment.Wgs84PlanetSegment._pieceSize = og.planetSegment.Wgs84PlanetSegment._heightLat / Math.pow(2, og.planetSegment.Wgs84PlanetSegment._maxPoleZoom);


og.inheritance.extend(og.planetSegment.Wgs84PlanetSegment, og.planetSegment.PlanetSegment);

og.planetSegment.Wgs84PlanetSegment.RATIO_LOD = 1.12;

og.planetSegment.Wgs84PlanetSegment.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;

    var maxPoleZoom;
    var lat = this.extent.northEast.lat;
    if (lat > 0) {
        //north pole limits
        var Yz = Math.floor((90.0 - lat) / og.planetSegment.Wgs84PlanetSegment._pieceSize);
        maxPoleZoom = Math.floor(Yz / 16) + 7;
    } else {
        //south pole limits
        var Yz = Math.floor((og.mercator.MIN_LAT - lat) / og.planetSegment.Wgs84PlanetSegment._pieceSize);
        maxPoleZoom = 12 - Math.floor(Yz / 16);
    }

    return camera.projectedSize(sphere.center) > og.planetSegment.Wgs84PlanetSegment.RATIO_LOD * sphere.radius ||
        this.zoomIndex > maxPoleZoom;
};

og.planetSegment.Wgs84PlanetSegment.prototype.assignTileIndexes = function (zoomIndex, extent) {
    this.zoomIndex = zoomIndex;
    this.extent = extent;

    this.tileX = Math.round(Math.abs(-180.0 - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));

    var lat = extent.northEast.lat;
    if (lat > 0) {
        //north pole
        this.tileY = Math.round((90.0 - lat) / (extent.northEast.lat - extent.southWest.lat));
    } else {
        //south pole
        this.tileY = Math.round((og.mercator.MIN_LAT - lat) / (extent.northEast.lat - extent.southWest.lat));
    }
};

og.planetSegment.Wgs84PlanetSegment.prototype.createPlainVertices = function (gridSize) {
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
            var v = this.planet.ellipsoid.LonLat2ECEF(new og.LonLat(esw_lon + j * llStep, ene_lat - i * ltStep));
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

og.planetSegment.Wgs84PlanetSegment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this.extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(new og.LonLat(extent.southWest.lon, extent.southWest.lat),
        new og.LonLat(extent.southWest.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.northEast.lat),
        new og.LonLat(extent.northEast.lon, extent.southWest.lat));

    for (var i = 0; i < v.length; i++) {
        var coord = ellipsoid.LonLat2ECEF(v[i]);
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


