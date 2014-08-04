goog.provide('og.Extent');

goog.require('og.LonLat');
goog.require('og.proj.Projection');

og.Extent = function (sw, ne, projection) {
    this.southWest = sw || new og.LonLat();
    this.northEast = ne || new og.LonLat();
    this.projection = projection || null;
};

og.Extent.FULL_MERC = new og.Extent(og.LonLat.SW_MERC, og.LonLat.NE_MERC);
og.Extent.NORTH_POLE_DEG = new og.Extent(og.LonLat.NW_MERC_DEG, new og.LonLat(180.0, 90.0));
og.Extent.SOUTH_POLE_DEG = new og.Extent(new og.LonLat(-180.0, -90.0), og.LonLat.SE_MERC_DEG);

og.Extent.createFromArray = function (arr) {
    return new og.Extent(new og.LonLat(arr[0], arr[1]), new og.LonLat(arr[2], arr[3]));
};

og.Extent.prototype.isInside = function (lonlat) {
    var sw = this.southWest,
        ne = this.northEast;
    return lonlat.lon >= sw.lon && lonlat.lon <= ne.lon &&
           lonlat.lat >= sw.lat && lonlat.lat <= ne.lat;
};

og.Extent.prototype.getWidth = function () {
    return this.northEast.lon - this.southWest.lon;
};

og.Extent.prototype.getHeight = function () {
    return this.northEast.lat - this.southWest.lat
};

og.Extent.prototype.clone = function () {
    return new og.Extent(this.sw, this.ne);
};

og.Extent.prototype.getCenter = function () {
    var sw = this.southWest, ne = this.northEast;
    return new og.LonLat(sw.lon + (ne.lon - sw.lon) * 0.5, sw.lat + (ne.lat - sw.lat) * 0.5);
};

og.Extent.prototype.getNorthWest = function () {
    return new og.LonLat(this.northEast.lon, this.southWest.lat);
};

og.Extent.prototype.getNorthEast = function () {
    return new og.LonLat(this.northEast.lon, this.northEast.lat);
};

og.Extent.prototype.getSouthWest = function () {
    return new og.LonLat(this.southWest.lon, this.southWest.lat);
};

og.Extent.prototype.getSouthEast = function () {
    return new og.LonLat(this.southWest.lon, this.northEast.lat);
};

og.Extent.prototype.getNorth = function () {
    return this.northEast.lat;
};

og.Extent.prototype.getEast = function () {
    return this.northEast.lon;
};

og.Extent.prototype.getWest = function () {
    return this.southWest.lon;
};

og.Extent.prototype.getSouth = function () {
    return this.southWest.lat;
};

og.Extent.fromTile = function (x, y, z) {
    var H = Math.pow(2, z),
        W = Math.pow(2, z),
        lnSize = 360 / W,
        ltSize = 180.0 / H;

    var left = -180.0 + x * lnSize,
        top = 90 - y * ltSize,
        bottom = top - ltSize,
        right = left + lnSize;

    return new og.Extent(new og.LonLat(left, bottom), new og.LonLat(right, top));
};

/**
 * @param {og.Extent} extent Extent.
 * @return {boolean} Equals.
 */
og.Extent.prototype.equals = function (extent) {
    return this.southWest.lon == extent.southWest.lon && this.southWest.lat == extent.southWest.lat &&
        this.northEast.lon == extent.northEast.lon && this.northEast.lat == extent.northEast.lat;
};