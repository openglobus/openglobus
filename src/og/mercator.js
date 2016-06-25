goog.provide('og.mercator');

/**
 * Mercator size.
 * @const
 * @type {number}
 */
og.mercator.POLE = 20037508.34;

/**
 * Double mercator size.
 * @const
 * @type {number}
 */
og.mercator.POLE_DOUBLE = 2.0 * og.mercator.POLE;

/**
 * One by mercator double size.
 * @const
 * @type {number}
 */
og.mercator.ONE_BY_POLE_DOUBLE = 1.0 / og.mercator.POLE_DOUBLE;

/**
 * Converts degrees longitude to mercator coordinate.
 * @function
 * @param {number} lon - Degrees geodetic longitude.
 * @returns {number}
 */
og.mercator.forward_lon = function (lon) {
    return lon * og.mercator.POLE / 180;
};

/**
 * Converts degrees latitude to mercator coordinate.
 * @function
 * @param {number} lat - Degrees geodetic latitude.
 * @returns {number}
 */
og.mercator.forward_lat = function (lat) {
    return Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * og.mercator.POLE;
};

/**
 * Converts mercator longitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator longitude.
 * @returns {number}
 */
og.mercator.inverse_lon = function (lon) {
    return 180 * lon / og.mercator.POLE;
};

/**
 * Converts mercator latitude to degrees coordinate.
 * @function
 * @param {number} lon - Mercator latitude.
 * @returns {number}
 */
og.mercator.inverse_lat = function (lat) {
    return 180 / Math.PI * (2 * Math.atan(Math.exp((lat / og.mercator.POLE) * Math.PI)) - Math.PI / 2);
};

/**
 * Returns mercator map tile grid horizontal coordinate index by geodetic 
 * longitude and zoom level. Where top left corner of the grid is 0 coordinate index.
 * @function
 * @param {number} lon - Geodetic degrees longitude.
 * @param {number} zoom - Zoom level.
 * @returns {number}
 */
og.mercator.getTileX = function (lon, zoom) {
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
og.mercator.getTileY = function (lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

/**
 * Converts geodetic coordinate array to mercator coordinate array.
 * @function
 * @param {Array.<og.LonLat>} lonLatArr - LonLat array to convert.
 * @returns {Array.<og.LonLat>}
 */
og.mercator.forwardArray = function (lonlatArr) {
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
og.mercator.MAX_LAT = og.mercator.inverse_lat(og.mercator.POLE);

/**
 * Min mercator latitude.
 * @const
 * @type {number}
 */
og.mercator.MIN_LAT = -og.mercator.MAX_LAT;
