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
 * Whole mercator extent.
 * @const
 */
og.Extent.FULL_MERC = new og.Extent(og.LonLat.SW_MERC, og.LonLat.NE_MERC);

/**
 * Degrees extent from north mercator limit to north pole.
 * @const
 */
og.Extent.NORTH_POLE_DEG = new og.Extent(og.LonLat.NW_MERC_DEG, new og.LonLat(180.0, 90.0));

/**
 * Degrees extent from south pole to south mercator limit.
 * @const
 */
og.Extent.SOUTH_POLE_DEG = new og.Extent(new og.LonLat(-180.0, -90.0), og.LonLat.SE_MERC_DEG);

/**
 * Creates extent instance.
 * @static
 * @param {og.LonLat} sw - South west(left bottom) extent corner.
 * @param {og.LonLat} ne - North east(right top) extent corner.
 * @return {og.Extent} Extent instance.
 */
og.extent = function (sw, ne) {
    return new og.Extent(sw, ne);
};

/**
 * Creates extent instance from values in array.
 * @static
 * @param {Array.<number,number,number,number>} arr - South west and north east longitude and latidudes packed in array.
 * @return {og.Extent} Extent object.
 */
og.Extent.createFromArray = function (arr) {
    return new og.Extent(new og.LonLat(arr[0], arr[1]), new og.LonLat(arr[2], arr[3]));
};

/**
 * Creates bound extent instance by coordinate array.
 * @static
 * @param {Array.<og.LonLat>} arr - Coordinate array.
 * @return {og.Extent} Extent object.
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
 * Creates bound extent instance by coordinate array.
 * @static
 * @param {Array.<Array<number,number>>} arr - Coordinate array.
 * @return {og.Extent} Extent object.
 */
og.Extent.createByCoordinatesArr = function (arr) {
    var lonmin = og.math.MAX, lonmax = og.math.MIN,
        latmin = og.math.MAX, latmax = og.math.MIN;
    for (var i = 0; i < arr.length; i++) {
        var vi = arr[i];
        if (vi[0] < lonmin) lonmin = vi[0];
        if (vi[0] > lonmax) lonmax = vi[0];
        if (vi[1] < latmin) latmin = vi[1];
        if (vi[1] > latmax) latmax = vi[1];
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
 * Sets current bounding extent object by coordinate array.
 * @public
 * @param {Array.<og.LonLat>} arr - Coordinate array.
 * @return {og.Extent} Current extent.
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
    return this;
};

/**
 * Determines if point inside extent.
 * @public
 * @param {og.LonLat} lonlat - Coordinate point.
 * @return {boolean} Returns true if point inside extent.
 */
og.Extent.prototype.isInside = function (lonlat) {
    var sw = this.southWest,
        ne = this.northEast;
    return lonlat.lon >= sw.lon && lonlat.lon <= ne.lon &&
           lonlat.lat >= sw.lat && lonlat.lat <= ne.lat;
};

/**
 * Returns true if two extent overlap each other.
 * @public
 * @param {og.Extent} e - Another extent.
 * @return {boolean}
 */
og.Extent.prototype.overlaps = function (e) {
    var sw = this.southWest,
        ne = this.northEast;
    return sw.lon <= e.northEast.lon && ne.lon >= e.southWest.lon &&
           sw.lat <= e.northEast.lat && ne.lat >= e.southWest.lat;
};

/**
 * Gets extent width.
 * @public
 * @return {number} Extent width.
 */
og.Extent.prototype.getWidth = function () {
    return this.northEast.lon - this.southWest.lon;
};

/**
 * Gets extent height.
 * @public
 * @return {number} Extent height.
 */
og.Extent.prototype.getHeight = function () {
    return this.northEast.lat - this.southWest.lat
};

/**
 * Creates clone instance of the current extent.
 * @public
 * @return {og.Extent} Extent clone.
 */
og.Extent.prototype.clone = function () {
    return new og.Extent(this.southWest.clone(), this.northEast.clone());
};

/**
 * Gets the center coordinate of the extent.
 * @public
 * @return {number} Center coordinate.
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
    return this.southWest.lon === extent.southWest.lon && this.southWest.lat === extent.southWest.lat &&
        this.northEast.lon === extent.northEast.lon && this.northEast.lat === extent.northEast.lat;
};

/**
 * Converts extent coordinates to mercator projection coordinates.
 * @public
 * @return {og.Extent} New instance of the current extent.
 */
og.Extent.prototype.forwardMercator = function () {
    return new og.Extent(this.southWest.forwardMercator(), this.northEast.forwardMercator());
};

/**
 * Converts extent coordinates from mercator projection to degrees.
 * @public
 * @return {og.Extent} New instance of the current extent.
 */
og.Extent.prototype.inverseMercator = function () {
    return new og.Extent(this.southWest.inverseMercator(), this.northEast.inverseMercator());
};

/**
 * Gets cartesian bounding bounds of the current ellipsoid.
 * @public
 * @param {og.Ellipsoid} ellipsoid - Ellipsoid.
 * @return {Array.<number,number,number,number,number,number>} Cartesian 3d coordinate array.
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

og.Extent.prototype.toString = function () {
    return "[" + this.southWest.lon + ", " + this.southWest.lat + ", " + this.northEast.lon + ", " + this.northEast.lat + "]";
};
