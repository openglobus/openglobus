goog.provide('og.planetSegment.Wgs84PlanetSegment');

goog.require('og.planetSegment.PlanetSegment');
goog.require('og.inheritance');
goog.require('og.LonLat');
goog.require('og.proj.EPSG4326');

og.planetSegment.Wgs84PlanetSegment = function () {
    og.inheritance.base(this);

    this._projection = og.proj.EPSG4326;
};


og.inheritance.extend(og.planetSegment.Wgs84PlanetSegment, og.planetSegment.PlanetSegment);

og.planetSegment.Wgs84PlanetSegment.RATIO_LOD = 1.12;

og.planetSegment.Wgs84PlanetSegment.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;
    return camera.projectedSize(sphere.center) > og.planetSegment.Wgs84PlanetSegment.RATIO_LOD * sphere.radius ||
        this.zoomIndex > 3;
};

og.planetSegment.Wgs84PlanetSegment.prototype.assignTileIndexes = function (zoomIndex, extent) {
    this.zoomIndex = zoomIndex;
    this.extent = extent;
    var c = extent.getCenter();
    this.tileX = og.mercator.getTileX(c.lon, zoomIndex);
    
    var lat = extent.northEast.lat;
    if (lat > 0) {
        //north pole
        this.tileY =  Math.floor((90.0 - lat) / extent.getHeight());
    } else {
        //south pole
        this.tileY = Math.floor((og.mercator.MIN_LAT - lat) / extent.getHeight());
    }
};

og.planetSegment.Wgs84PlanetSegment.prototype.createPlainVertices = function (gridSize) {
    var verts = [];
    var ind = 0;
    var e = this.extent;
    var lonSize = e.getWidth();
    var latSize = e.getHeight();
    var llStep = lonSize / gridSize;
    var ltStep = latSize / gridSize;
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;

    for (var i = 0; i <= gridSize; i++) {
        for (var j = 0; j <= gridSize; j++) {
            var v = this.planet.ellipsoid.LonLat2ECEF(new og.LonLat(esw_lon + j * llStep, ene_lat - i * ltStep));
            verts[ind++] = v.x;
            verts[ind++] = v.y;
            verts[ind++] = v.z;
        }
    }
    this.plainVertices = verts;
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


