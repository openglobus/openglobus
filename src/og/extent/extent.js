goog.provide('og.Extent');
goog.provide('og.extent');

goog.require('og.LonLat');
goog.require('og.math');

/**
 * Represents geographical coordinates extent.
 * @class
 * @param {og.LonLat} [sw] - South West extent corner coordiantes.
 * @param {og.LonLat} [ne] - North East extent corner coordiantes.
 */
og.Extent = function (sw, ne) {
    this.southWest = sw || new og.LonLat();
    this.northEast = ne || new og.LonLat();
};

og.extent = function (sw, ne) {
    return new og.Extent(sw, ne);
};


og.Extent.prototype.intersects = function (e) {
    return this.southWest.lon < e.northEast.lon && this.northEast.lon > e.southWest.lon &&
       this.southWest.lat < e.northEast.lat && this.northEast.lat > e.southWest.lat;
};

og.Extent.FULL_MERC = new og.Extent(og.LonLat.SW_MERC, og.LonLat.NE_MERC);
og.Extent.NORTH_POLE_DEG = new og.Extent(og.LonLat.NW_MERC_DEG, new og.LonLat(180.0, 90.0));
og.Extent.SOUTH_POLE_DEG = new og.Extent(new og.LonLat(-180.0, -90.0), og.LonLat.SE_MERC_DEG);

og.Extent.createByCoordinates = function (arr) {
    var lonmin = og.math.MAX, lonmax = og.math.MIN,
        latmin = og.math.MAX, latmax = og.math.MIN;
    for (var i = 0; i < arr.length; i++) {
        var vi = arr[i];
        if (vi.lon < lonmin) lonmin = vi.lon;
        if (vi.lon > lonmax) lonmax = vi.lon;
        if (vi.lat < latmin) latmin = vi.lat;
        if (vi.lat > latmax) latmax = vi.lat;
    }
    return new og.Extent(new og.LonLat(lonmin, latmin), new og.LonLat(lonmax, latmax));
};

og.Extent.prototype.setByCoordinates = function (arr) {
    var lonmin = og.math.MAX, lonmax = og.math.MIN,
        latmin = og.math.MAX, latmax = og.math.MIN;
    for (var i = 0; i < arr.length; i++) {
        var vi = arr[i];
        if (vi.lon < lonmin) lonmin = vi.lon;
        if (vi.lon > lonmax) lonmax = vi.lon;
        if (vi.lat < latmin) latmin = vi.lat;
        if (vi.lat > latmax) latmax = vi.lat;
    }
    this.southWest.lon = lonmin;
    this.southWest.lat = latmin;
    this.northEast.lon = lonmax;
    this.northEast.lat = latmax;
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
    return new og.Extent(this.southWest.clone(), this.northEast.clone());
};

og.Extent.prototype.getCenter = function () {
    var sw = this.southWest, ne = this.northEast;
    return new og.LonLat(sw.lon + (ne.lon - sw.lon) * 0.5, sw.lat + (ne.lat - sw.lat) * 0.5);
};

og.Extent.prototype.getNorthWest = function () {
    return new og.LonLat(this.southWest.lon, this.northEast.lat);
};

og.Extent.prototype.getNorthEast = function () {
    return new og.LonLat(this.northEast.lon, this.northEast.lat);
};

og.Extent.prototype.getSouthWest = function () {
    return new og.LonLat(this.southWest.lon, this.southWest.lat);
};

og.Extent.prototype.getSouthEast = function () {
    return new og.LonLat(this.northEast.lon, this.southWest.lat);
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

/**
 * Creates extent by meractor grid tile coordinates.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {og.Extent}
 */
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
 * Returns extents are equals.
 * @param {og.Extent} extent - Extent.
 * @returns {boolean}
 */
og.Extent.prototype.equals = function (extent) {
    return this.southWest.lon == extent.southWest.lon && this.southWest.lat == extent.southWest.lat &&
        this.northEast.lon == extent.northEast.lon && this.northEast.lat == extent.northEast.lat;
};

og.Extent.prototype.forwardMercator = function () {
    return new og.Extent(this.southWest.forwardMercator(), this.northEast.forwardMercator());
};