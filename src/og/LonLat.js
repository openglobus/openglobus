/**
 * @module og/LonLat
 */

"use strict";

import * as mercator from "./mercator.js";

const HALF_PI = Math.PI * 0.5;
const INV_PI_BY_180 = 180.0 / Math.PI;
const INV_PI_BY_360 = INV_PI_BY_180 * 2.0;
const PI_BY_360 = Math.PI / 360.0;
const INV_PI_BY_180_HALF_PI = INV_PI_BY_180 * HALF_PI;

/**
 * Represents a geographical point with a certain latitude, longitude and height.
 * @class
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height over the surface.
 */
export class LonLat {
    /**
     * @param {number} [lon] - Longitude.
     * @param {number} [lat] - Latitude.
     * @param {number} [height] - Height over the surface.
     */
    constructor(lon = 0, lat = 0, height = 0) {
        /**
         * Longitude.
         * @public
         * @type {number}
         */
        this.lon = lon;

        /**
         * Latitude.
         * @public
         * @type {number}
         */
        this.lat = lat;

        /**
         * Height.
         * @public
         * @type {number}
         */
        this.height = height;
    }

    isZero() {
        return this.lon === 0.0 && this.lat === 0.0 && this.height === 0.0;
    }

    /**
     * Creates coordinates array.
     * @static
     * @param{Array.<Array<number>>} arr - Coordinates array data. (exactly 3 entries)
     * @return{Array.<LonLat>} the same coordinates array but each element is LonLat instance.
     */
    static join(arr) {
        var res = [];
        for (var i = 0; i < arr.length; i++) {
            var ai = arr[i];
            res[i] = new LonLat(ai[0], ai[1], ai[2]);
        }
        return res;
    }

    /**
     * Creates an object by coordinate array.
     * @static
     * @param {Array.<number>} arr - Coordiante array, where first is longitude, second is latitude and third is a height. (exactly 3 entries)
     * @returns {LonLat} -
     */
    static createFromArray(arr) {
        return new LonLat(arr[0], arr[1], arr[2]);
    }

    /**
     * Converts degrees to mercator coordinates.
     * @static
     * @param {number} lon - Degrees longitude.
     * @param {number} lat - Degrees latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    static forwardMercator(lon, lat, height) {
        return new LonLat(
            lon * mercator.POLE_BY_180,
            Math.log(Math.tan((90.0 + lat) * PI_BY_360)) * mercator.POLE_BY_PI,
            height
        );
    }

    /**
     * Converts degrees to mercator coordinates.
     * @static
     * @param {LonLat} lonLat - Input geodetic degree coordinates
     * @param {LonLat} res - Output mercator coordinates
     * @returns {LonLat} - Output mercator coordinates
     */
    static forwardMercatorRes(lonLat, res) {
        res.lon = lonLat.lon * mercator.POLE_BY_180;
        res.lat = Math.log(Math.tan((90.0 + lonLat.lat) * PI_BY_360)) * mercator.POLE_BY_PI,
            res.height = lonLat.height;
        return res;
    }

    /**
     * Converts mercator to degrees coordinates.
     * @static
     * @param {number} x - Mercator longitude.
     * @param {number} y - Mercator latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    static inverseMercator(x, y, height = 0) {
        return new LonLat(
            x * mercator.INV_POLE_BY_180,
            INV_PI_BY_360 * Math.atan(Math.exp(y * mercator.PI_BY_POLE)) - INV_PI_BY_180_HALF_PI,
            height
        );
    }

    /**
     * Sets coordinates.
     * @public
     * @param {number} [lon] - Longitude.
     * @param {number} [lat] - Latitude.
     * @param {number} [height] - Height.
     * @returns {LonLat} -
     */
    set(lon = 0, lat = 0, height = 0) {
        this.lon = lon;
        this.lat = lat;
        this.height = height;
        return this;
    }

    /**
     * Copy coordinates.
     * @public
     * @param {LonLat} [lonLat] - Coordinates to copy.
     * @returns {LonLat} -
     */
    copy(lonLat) {
        this.lon = lonLat.lon;
        this.lat = lonLat.lat;
        this.height = lonLat.height;
        return this;
    }

    /**
     * Clone the coordiante.
     * @public
     * @returns {LonLat} -
     */
    clone() {
        return new LonLat(this.lon, this.lat, this.height);
    }

    /**
     * Converts to mercator coordinates.
     * @public
     * @returns {LonLat} -
     */
    forwardMercator() {
        return LonLat.forwardMercator(this.lon, this.lat, this.height);
    }

    forwardMercatorEPS01() {
        var lat = this.lat;
        if (lat > 89.9) {
            lat = 89.9;
        } else if (lat < -89.9) {
            lat = -89.9;
        }
        return new LonLat(
            this.lon * mercator.POLE_BY_180,
            Math.log(Math.tan((90.0 + lat) * PI_BY_360)) * mercator.POLE_BY_PI
        );
    }

    /**
     * Converts from mercator coordinates.
     * @public
     * @returns {LonLat} -
     */
    inverseMercator() {
        return LonLat.inverseMercator(this.lon, this.lat, this.height);
    }

    /**
     * Compares coordinates.
     * @public
     * @param {LonLat} b - Coordinate to compare with.
     * @returns {boolean} -
     */
    equal(b) {
        if (b.height) {
            return this.lon === b.lon && this.lat === b.lat && this.height === b.height;
        } else {
            return this.lon === b.lon && this.lat === b.lat;
        }
    }
}
