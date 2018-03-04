
/**
 * @module og/LonLat
 */

'use strict';

import { mercator } from './mercator.js';

/**
 * Represents a geographical point with a certain latitude, longitude and height.
 * @class
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height over the surface.
 */
const LonLat = function (lon, lat, height) {

    /**
     * Longitude.
     * @public
     * @type {number}
     */
    this.lon = lon || 0;

    /**
     * Latitude.
     * @public
     * @type {number}
     */
    this.lat = lat || 0;

    /**
     * Height.
     * @public
     * @type {number}
     */
    this.height = height || 0;
};

/**
 * Creates coordinates array.
 * @static
 * @param{Array.<Array<number,number,number>>} arr - Coordinates array data.
 * @return{Array.<og.LonLat>} the same coordinates array but each element is LonLat instance.
 */
LonLat.lonLatArray = function (arr) {
    var res = [];
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i];
        res[i] = new LonLat(ai[0], ai[1], ai[2]);
    }
    return res;
};

/**
 * Creates an object by coordinate array.
 * @static
 * @param {Array.<number,number,number>} arr - Coordiante array, where first is longitude, second is latitude and third is a height.
 * @returns {og.LonLat}
 */
LonLat.createFromArray = function (arr) {
    return new LonLat(arr[0], arr[1], arr[2]);
};

/**
 * Converts degrees to mercator coordinates.
 * @static
 * @param {number} lon - Degrees longitude.
 * @param {number} lat - Degrees latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
LonLat.forwardMercator = function (lon, lat, height) {
    var x = lon * mercator.POLE / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * mercator.POLE;
    return new LonLat(x, y, height);
};

/**
 * Converts mercator to degrees coordinates.
 * @static
 * @param {number} x - Mercator longitude.
 * @param {number} y - Mercator latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
LonLat.inverseMercator = function (x, y, height) {
    var lon = 180 * x / mercator.POLE;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / mercator.POLE) * Math.PI)) - Math.PI / 2);
    return new LonLat(lon, lat, height);
};

/**
 * Sets coordinates.
 * @public
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
LonLat.prototype.set = function (lon, lat, height) {
    this.lon = lon || 0;
    this.lat = lat || 0;
    this.height = height || 0;
    return this;
};

/**
 * Copy coordinates.
 * @public
 * @param {og.LonLat} [lonLat] - Coordinates to copy.
 * @returns {og.LonLat}
 */
LonLat.prototype.copy = function (lonLat) {
    this.lon = lonLat.lon;
    this.lat = lonLat.lat;
    this.height = lonLat.height;
    return this;
};

/**
 * Clone the coordiante.
 * @public
 * @returns {og.LonLat}
 */
LonLat.prototype.clone = function () {
    return new LonLat(this.lon, this.lat, this.height);
};

/**
 * Converts to mercator coordinates.
 * @public
 * @returns {og.LonLat}
 */
LonLat.prototype.forwardMercator = function () {
    return LonLat.forwardMercator(this.lon, this.lat, this.height);
};

LonLat.prototype.forwardMercatorEPS01 = function () {
    var lat = this.lat;
    if (lat > 89.9) {
        lat = 89.9;
    } else if (lat < -89.9) {
        lat = -89.9;
    }
    return new LonLat(
        this.lon * mercator.POLE / 180,
        Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * mercator.POLE);
};


/**
 * Converts from mercator coordinates.
 * @public
 * @returns {og.LonLat}
 */
LonLat.prototype.inverseMercator = function () {
    return LonLat.inverseMercator(this.lon, this.lat, this.height);
};

/**
 * Compares coordinates.
 * @public
 * @param {og.LonLat} b - Coordinate to compare with.
 * @returns {boolean}
 */
LonLat.prototype.equal = function (b) {
    if (b.height) {
        return this.lon == b.lon && this.lat == b.lat && this.height == b.height;
    } else {
        return this.lon == b.lon && this.lat == b.lat;
    }
};

export { LonLat };