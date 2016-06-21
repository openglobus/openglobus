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
    /**
     * @public
     */
    this.southWest = sw || new og.LonLat();

    /**
     * @public
     */
    this.northEast = ne || new og.LonLat();
};

/**
 * @const
 */
og.Extent.FULL_MERC = new og.Extent(og.LonLat.SW_MERC, og.LonLat.NE_MERC);

/**
 * @const
 */
og.Extent.NORTH_POLE_DEG = new og.Extent(og.LonLat.NW_MERC_DEG, new og.LonLat(180.0, 90.0));

/**
 * @const
 */
og.Extent.SOUTH_POLE_DEG = new og.Extent(new og.LonLat(-180.0, -90.0), og.LonLat.SE_MERC_DEG);

/**
 * @static
 */
og.extent = function (sw, ne) {
    return new og.Extent(sw, ne);
};

/**
 * @static
 */
og.Extent.createFromArray = function (arr) {
    return new og.Extent(new og.LonLat(arr[0], arr[1]), new og.LonLat(arr[2], arr[3]));
};

/**
 * @static
 */
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

/**
 * Creates extent by meractor grid tile coordinates.
 * @static
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
 * @public
 */
og.Extent.prototype.intersects = function (e) {
    return this.southWest.lon < e.northEast.lon && this.northEast.lon > e.southWest.lon &&
       this.southWest.lat < e.northEast.lat && this.northEast.lat > e.southWest.lat;
};

/**
 * @public
 */
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

/**
 * @public
 */
og.Extent.prototype.isInside = function (lonlat) {
    var sw = this.southWest,
        ne = this.northEast;
    return lonlat.lon >= sw.lon && lonlat.lon <= ne.lon &&
           lonlat.lat >= sw.lat && lonlat.lat <= ne.lat;
};

/**
 * @public
 */
og.Extent.prototype.getWidth = function () {
    return this.northEast.lon - this.southWest.lon;
};

/**
 * @public
 */
og.Extent.prototype.getHeight = function () {
    return this.northEast.lat - this.southWest.lat
};

/**
 * @public
 */
og.Extent.prototype.clone = function () {
    return new og.Extent(this.southWest.clone(), this.northEast.clone());
};

/**
 * @public
 */
og.Extent.prototype.getCenter = function () {
    var sw = this.southWest, ne = this.northEast;
    return new og.LonLat(sw.lon + (ne.lon - sw.lon) * 0.5, sw.lat + (ne.lat - sw.lat) * 0.5);
};

/**
 * @public
 */
og.Extent.prototype.getNorthWest = function () {
    return new og.LonLat(this.southWest.lon, this.northEast.lat);
};

/**
 * @public
 */
og.Extent.prototype.getNorthEast = function () {
    return new og.LonLat(this.northEast.lon, this.northEast.lat);
};

og.Extent.prototype.getSouthWest = function () {
    return new og.LonLat(this.southWest.lon, this.southWest.lat);
};

/**
 * @public
 */
og.Extent.prototype.getSouthEast = function () {
    return new og.LonLat(this.northEast.lon, this.southWest.lat);
};

/**
 * @public
 */
og.Extent.prototype.getNorth = function () {
    return this.northEast.lat;
};

og.Extent.prototype.getEast = function () {
    return this.northEast.lon;
};

/**
 * @public
 */
og.Extent.prototype.getWest = function () {
    return this.southWest.lon;
};

/**
 * @public
 */
og.Extent.prototype.getSouth = function () {
    return this.southWest.lat;
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

/**
 * @public
 */
og.Extent.prototype.forwardMercator = function () {
    return new og.Extent(this.southWest.forwardMercator(), this.northEast.forwardMercator());
};

/**
 * @public
 */
og.Extent.prototype.inverseMercator = function () {
    return new og.Extent(this.southWest.inverseMercator(), this.northEast.inverseMercator());
};

/**
 * @public
 */
og.Extent.prototype.getCartesianBounds = function (ellipsoid) {
    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX,
        ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;

    var v = [new og.LonLat(this.southWest.lon, this.southWest.lat),
        new og.LonLat(this.southWest.lon, this.northEast.lat),
        new og.LonLat(this.northEast.lon, this.northEast.lat),
        new og.LonLat(this.northEast.lon, this.southWest.lat)];

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

    return [xmin, xmax, ymin, ymax, zmin, zmax];
};