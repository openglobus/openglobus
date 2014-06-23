goog.provide('og.Extent');

goog.require('og.LonLat');

og.Extent = function (sw, ne) {
    this.southWest = sw || new og.LonLat();
    this.northEast = ne || new og.LonLat();
};

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
    var H = Math.pow(2, zoom),
        W = Math.pow(2, zoom),
        lnSize = 360 / W,
        ltSize = 180.0 / H;

    var left = -180.0 + x * lnSize,
        top = 90 - y * ltSize,
        bottom = top - ltSize,
        right = left + lnSize;

    return new og.Extent(new og.LonLat(left, bottom), new og.LonLat(right, top));
};
