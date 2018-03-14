/**
 * @module og/mercator
 */

'use strict';

/**
 * Mercator size.
 * @const
 * @type {number}
 */
export const POLE = 20037508.34;

/**
 * Double mercator size.
 * @const
 * @type {number}
 */
export const POLE_DOUBLE = 2.0 * POLE;

/**
 * One by mercator double size.
 * @const
 * @type {number}
 */
export const ONE_BY_POLE_DOUBLE = 1.0 / POLE_DOUBLE;

/**
 * Converts degrees longitude to mercator coordinate.
 * @function
 * @param {number} lon - Degrees geodetic longitude.
 * @returns {number}
 */
export function forward_lon(lon) {
    return lon * POLE / 180;
};

/**
 * Converts degrees latitude to mercator coordinate.
 * @function
 * @param {number} lat - Degrees geodetic latitude.
 * @returns {number}
 */
export function forward_lat(lat) {
    return Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * POLE;
};

/**
 * Converts mercator longitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator longitude.
 * @returns {number}
 */
export function inverse_lon(lon) {
    return 180 * lon / POLE;
};

/**
 * Converts mercator latitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator latitude.
 * @returns {number}
 */
export function inverse_lat(lat) {
    return 180 / Math.PI * (2 * Math.atan(Math.exp((lat / POLE) * Math.PI)) - Math.PI / 2);
};

/**
 * Returns mercator map tile grid horizontal coordinate index by geodetic 
 * longitude and zoom level. Where top left corner of the grid is 0 coordinate index.
 * @function
 * @param {number} lon - Geodetic degrees longitude.
 * @param {number} zoom - Zoom level.
 * @returns {number}
 */
export function getTileX(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

/**
 * Returns mercator map tile grid vertical coordinate index by geodetic 
 * latitude and zoom level. Where top left corner of the grid is 0 coordinate index.
 * @function
 * @param {number} lat - Geodetic degrees latitude.
 * @param {number} zoom - Zoom level.
 * @returns {number}
 */
export function getTileY(lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

/**
 * Converts geodetic coordinate array to mercator coordinate array.
 * @function
 * @param {Array.<og.LonLat>} lonLatArr - LonLat array to convert.
 * @returns {Array.<og.LonLat>}
 */
export function forwardArray(lonlatArr) {
    var res = [];
    for (var i = 0; i < lonlatArr.length; i++) {
        res.push(lonlatArr[i].forwardMercator());
    }
    return res;
};

/**
 * Max mercator latitude.
 * @const
 * @type {number}
 */
export const MAX_LAT = inverse_lat(POLE);

/**
 * Min mercator latitude.
 * @const
 * @type {number}
 */
export const MIN_LAT = -MAX_LAT;
