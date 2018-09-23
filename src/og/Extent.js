/**
 * @module og/Extent
 */

'use strict';

import * as math from './math.js';
import * as mercator from './mercator.js';
import { LonLat } from './LonLat.js';

/**
 * Represents geographical coordinates extent.
 * @class
 * @param {og.LonLat} [sw] - South West extent corner coordiantes.
 * @param {og.LonLat} [ne] - North East extent corner coordiantes.
 */
const Extent = function (sw, ne) {
    /**
     * @public
     */
    this.southWest = sw || new LonLat();

    /**
     * @public
     */
    this.northEast = ne || new LonLat();
};

/**
 * Whole mercator extent.
 * @const
 */
Extent.FULL_MERC = new Extent(LonLat.SW_MERC, LonLat.NE_MERC);

/**
 * Degrees extent from north mercator limit to north pole.
 * @const
 */
Extent.NORTH_POLE_DEG = new Extent(LonLat.NW_MERC_DEG, new LonLat(180.0, 90.0));

/**
 * Degrees extent from south pole to south mercator limit.
 * @const
 */
Extent.SOUTH_POLE_DEG = new Extent(new LonLat(-180.0, -90.0), LonLat.SE_MERC_DEG);

/**
 * Creates extent instance from values in array.
 * @static
 * @param {Array.<number,number,number,number>} arr - South west and north east longitude and latidudes packed in array.
 * @return {og.Extent} Extent object.
 */
Extent.createFromArray = function (arr) {
    return new Extent(new LonLat(arr[0], arr[1]), new LonLat(arr[2], arr[3]));
};

/**
 * Creates bound extent instance by coordinate array.
 * @static
 * @param {Array.<og.LonLat>} arr - Coordinate array.
 * @return {og.Extent} Extent object.
 */
Extent.createByCoordinates = function (arr) {
    var lonmin = math.MAX, lonmax = math.MIN,
        latmin = math.MAX, latmax = math.MIN;
    for (var i = 0; i < arr.length; i++) {
        var vi = arr[i];
        if (vi.lon < lonmin) lonmin = vi.lon;
        if (vi.lon > lonmax) lonmax = vi.lon;
        if (vi.lat < latmin) latmin = vi.lat;
        if (vi.lat > latmax) latmax = vi.lat;
    }
    return new Extent(new LonLat(lonmin, latmin), new LonLat(lonmax, latmax));
};

/**
 * Creates bound extent instance by coordinate array.
 * @static
 * @param {Array.<Array<number,number>>} arr - Coordinate array.
 * @return {og.Extent} Extent object.
 */
Extent.createByCoordinatesArr = function (arr) {
    var lonmin = math.MAX, lonmax = math.MIN,
        latmin = math.MAX, latmax = math.MIN;
    for (var i = 0; i < arr.length; i++) {
        var vi = arr[i];
        if (vi[0] < lonmin) lonmin = vi[0];
        if (vi[0] > lonmax) lonmax = vi[0];
        if (vi[1] < latmin) latmin = vi[1];
        if (vi[1] > latmax) latmax = vi[1];
    }
    return new Extent(new LonLat(lonmin, latmin), new LonLat(lonmax, latmax));
};

/**
 * Creates extent by meractor grid tile coordinates.
 * @static
 * @param {number} x -
 * @param {number} y -
 * @param {number} z -
 * @param {number} width -
 * @param {number} height -
 * @returns {og.Extent} -
 */
Extent.fromTile = function (x, y, z, width, height) {
    width = width || mercator.POLE_DOUBLE;
    height = height || mercator.POLE_DOUBLE;
    var H = Math.pow(2, z),
        W = Math.pow(2, z),
        lnSize = width / W,
        ltSize = height / H;

    var left = -width * 0.5 + x * lnSize,
        top = height * 0.5 - y * ltSize,
        bottom = top - ltSize,
        right = left + lnSize;

    return new Extent(new LonLat(left, bottom), new LonLat(right, top));
};

/**
 * Sets current bounding extent object by coordinate array.
 * @public
 * @param {Array.<og.LonLat>} arr - Coordinate array.
 * @return {og.Extent} Current extent.
 */
Extent.prototype.setByCoordinates = function (arr) {
    var lonmin = math.MAX, lonmax = math.MIN,
        latmin = math.MAX, latmax = math.MIN;
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
 * @param {LonLat} lonlat - Coordinate point.
 * @return {boolean} Returns true if point inside extent.
 */
Extent.prototype.isInside = function (lonlat) {
    var sw = this.southWest,
        ne = this.northEast;
    return lonlat.lon >= sw.lon && lonlat.lon <= ne.lon &&
        lonlat.lat >= sw.lat && lonlat.lat <= ne.lat;
};

/**
 * Returns true if two extent overlap each other.
 * @public
 * @param {Extent} e - Another extent.
 * @return {boolean} -
 */
Extent.prototype.overlaps = function (e) {
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
Extent.prototype.getWidth = function () {
    return this.northEast.lon - this.southWest.lon;
};

/**
 * Gets extent height.
 * @public
 * @return {number} Extent height.
 */
Extent.prototype.getHeight = function () {
    return this.northEast.lat - this.southWest.lat
};

/**
 * Creates clone instance of the current extent.
 * @public
 * @return {og.Extent} Extent clone.
 */
Extent.prototype.clone = function () {
    return new Extent(this.southWest.clone(), this.northEast.clone());
};

/**
 * Gets the center coordinate of the extent.
 * @public
 * @return {number} Center coordinate.
 */
Extent.prototype.getCenter = function () {
    var sw = this.southWest, ne = this.northEast;
    return new LonLat(sw.lon + (ne.lon - sw.lon) * 0.5, sw.lat + (ne.lat - sw.lat) * 0.5);
};

/**
 * @public
 */
Extent.prototype.getNorthWest = function () {
    return new LonLat(this.southWest.lon, this.northEast.lat);
};

/**
 * @public
 */
Extent.prototype.getNorthEast = function () {
    return new LonLat(this.northEast.lon, this.northEast.lat);
};

Extent.prototype.getSouthWest = function () {
    return new LonLat(this.southWest.lon, this.southWest.lat);
};

/**
 * @public
 */
Extent.prototype.getSouthEast = function () {
    return new LonLat(this.northEast.lon, this.southWest.lat);
};

/**
 * @public
 */
Extent.prototype.getNorth = function () {
    return this.northEast.lat;
};

Extent.prototype.getEast = function () {
    return this.northEast.lon;
};

/**
 * @public
 */
Extent.prototype.getWest = function () {
    return this.southWest.lon;
};

/**
 * @public
 */
Extent.prototype.getSouth = function () {
    return this.southWest.lat;
};

/**
 * Returns extents are equals.
 * @param {og.Extent} extent - Extent.
 * @returns {boolean} -
 */
Extent.prototype.equals = function (extent) {
    return this.southWest.lon === extent.southWest.lon && this.southWest.lat === extent.southWest.lat &&
        this.northEast.lon === extent.northEast.lon && this.northEast.lat === extent.northEast.lat;
};

/**
 * Converts extent coordinates to mercator projection coordinates.
 * @public
 * @return {og.Extent} New instance of the current extent.
 */
Extent.prototype.forwardMercator = function () {
    return new Extent(this.southWest.forwardMercator(), this.northEast.forwardMercator());
};

/**
 * Converts extent coordinates from mercator projection to degrees.
 * @public
 * @return {og.Extent} New instance of the current extent.
 */
Extent.prototype.inverseMercator = function () {
    return new Extent(this.southWest.inverseMercator(), this.northEast.inverseMercator());
};

/**
 * Gets cartesian bounding bounds of the current ellipsoid.
 * @public
 * @param {og.Ellipsoid} ellipsoid - Ellipsoid.
 * @return {Array.<number,number,number,number,number,number>} Cartesian 3d coordinate array.
 */
Extent.prototype.getCartesianBounds = function (ellipsoid) {
    var xmin = math.MAX, xmax = math.MIN, ymin = math.MAX,
        ymax = math.MIN, zmin = math.MAX, zmax = math.MIN;

    var v = [new LonLat(this.southWest.lon, this.southWest.lat),
    new LonLat(this.southWest.lon, this.northEast.lat),
    new LonLat(this.northEast.lon, this.northEast.lat),
    new LonLat(this.northEast.lon, this.southWest.lat)];

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

    return [xmin, ymin, zmin, xmax, ymax, zmax];
};

Extent.prototype.toString = function () {
    return "[" + this.southWest.lon + ", " + this.southWest.lat + ", " + this.northEast.lon + ", " + this.northEast.lat + "]";
};

export { Extent };