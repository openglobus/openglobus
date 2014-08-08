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

og.planetSegment.Wgs84PlanetSegment.prototype.assignTileIndexes = function (zoomIndex, extent) {
    this.zoomIndex = zoomIndex;
    this.extent = extent;
    var c = extent.getCenter();
    this.tileX = og.mercator.getTileX(c.lon, zoomIndex);
    this.tileY = og.mercator.getTileY(c.lat, zoomIndex);
};

og.planetSegment.Wgs84PlanetSegment.prototype.createPlainVertices = function (gridSize) {
    var verts = [];
    var ind = 0;
    var e = this.extent;
    var lonSize = e.getWidth();
    var llStep = lonSize / gridSize;
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;

        for (var i = 0; i <= gridSize; i++) {
            for (var j = 0; j <= gridSize; j++) {
                var v = this.planet.ellipsoid.LonLat2ECEF(new og.LonLat(esw_lon + j * llStep, ene_lat - i * llStep));
                verts[ind++] = v.x;
                verts[ind++] = v.y;
                verts[ind++] = v.z;
            }
        }
    this.plainVertices = verts;
};

