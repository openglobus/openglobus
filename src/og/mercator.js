/**
 * @module og/mercator
 */

'use strict';

import { Extent } from "./Extent.js";
import { LonLat } from './LonLat.js';

/**
 * Mercator size.
 * @const
 * @type {number}
 */
export const POLE = 20037508.34;

export const POLE2 = POLE * 2.0;

export const PI_BY_POLE = Math.PI / POLE;

export const POLE_BY_PI = POLE / Math.PI;

const HALF_PI = Math.PI * 0.5;

export const POLE_BY_180 = POLE / 180.0;

export const INV_POLE_BY_180 = 180.0 / POLE;

const PI_BY_360 = Math.PI / 360.0;

const PI_BY_180 = Math.PI / 180.0;

const INV_PI_BY_180 = 180.0 / Math.PI;

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

export function forward(lonLat) {
    return new LonLat(lonLat.lon * POLE / 180.0, Math.log(Math.tan((90.0 + lonLat.lat) * PI_BY_360)) * POLE_BY_PI, lonLat.height);
}

/**
 * Converts degrees longitude to mercator coordinate.
 * @function
 * @param {number} lon - Degrees geodetic longitude.
 * @returns {number} -
 */
export function forward_lon(lon) {
    return lon * POLE / 180.0;
}

/**
 * Converts degrees latitude to mercator coordinate.
 * @function
 * @param {number} lat - Degrees geodetic latitude.
 * @returns {number} -
 */
export function forward_lat(lat) {
    return Math.log(Math.tan((90.0 + lat) * PI_BY_360)) * POLE_BY_PI;
}

/**
 * Converts mercator longitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator longitude.
 * @returns {number} -
 */
export function inverse_lon(lon) {
    return 180 * lon / POLE;
}

/**
 * Converts mercator latitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator latitude.
 * @returns {number} -
 */
export function inverse_lat(lat) {
    return INV_PI_BY_180 * (2.0 * Math.atan(Math.exp(lat * PI_BY_POLE)) - HALF_PI);
}

/**
 * Returns mercator map tile grid horizontal coordinate index by geodetic 
 * longitude and zoom level. Where top left corner of the grid is 0 coordinate index.
 * @function
 * @param {number} lon - Geodetic degrees longitude.
 * @param {number} zoom - Zoom level.
 * @returns {number}
 */
export function getTileX(lon, zoom) {
    return Math.floor((lon + 180) / 360.0 * Math.pow(2, zoom));
}

/**
 * Returns mercator map tile grid vertical coordinate index by geodetic 
 * latitude and zoom level. Where top left corner of the grid is 0 coordinate index.
 * @function
 * @param {number} lat - Geodetic degrees latitude.
 * @param {number} zoom - Zoom level.
 * @returns {number}
 */
export function getTileY(lat, zoom) {
    return Math.floor((1.0 - Math.log(Math.tan(lat * PI_BY_180) + 1.0 / Math.cos(lat * PI_BY_180)) / Math.PI) * 0.5 * Math.pow(2, zoom));
}

/**
 * Converts geodetic coordinate array to mercator coordinate array.
 * @function
 * @param {Array.<LonLat>} lonLatArr - LonLat array to convert.
 * @returns {Array.<LonLat>}
 */
export function forwardArray(lonlatArr) {
    var res = [];
    for (var i = 0; i < lonlatArr.length; i++) {
        res.push(lonlatArr[i].forwardMercator());
    }
    return res;
}

export function getTileExtent(x, y, z) {
    let size = POLE2 / Math.pow(2, z),
        sw = new LonLat(-POLE + x * size, POLE - y * size - size);
    return new Extent(sw, new LonLat(sw.lon + size, sw.lat + size));
}

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
