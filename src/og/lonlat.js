goog.provide('og.LonLat');

goog.require('og.mercator');

/**
 * Represents a geographical point with a certain latitude, longitude and height.
 * @class
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height over the surface.
 */
og.LonLat = function (lon, lat, height) {

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
 * Creates an object representing a geographical point with the optionaly given latitude, longitude and height.
 * @function
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height over the surface.
 * @returns {og.LonLat}
 */
og.lonLat = function (lon, lat, height) {
    return new og.LonLat(lon, lat, height);
};

/**
 * Creates coordinates array.
 * @static
 * @param{Array.<Array<number,number,number>>} arr - Coordinates array data.
 * @return{Array.<og.LonLat>} the same coordinates array but each element is LonLat instance.
 */
og.lonLatArray = function (arr) {
    var res = [];
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i];
        res[i] = new og.LonLat(ai[0], ai[1], ai[2]);
    }
    return res;
};

/**
 * Creates an object by coordinate array.
 * @static
 * @param {Array.<number,number,number>} arr - Coordiante array, where first is longitude, second is latitude and third is a height.
 * @returns {og.LonLat}
 */
og.LonLat.createFromArray = function (arr) {
    return new og.LonLat(arr[0], arr[1], arr[2]);
};

/**
 * Converts degrees to mercator coordinates.
 * @static
 * @param {number} lon - Degrees longitude.
 * @param {number} lat - Degrees latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
og.LonLat.forwardMercator = function (lon, lat, height) {
    var x = lon * og.mercator.POLE / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * og.mercator.POLE;
    return new og.LonLat(x, y, height);
};

/**
 * Converts mercator to degrees coordinates.
 * @static
 * @param {number} x - Mercator longitude.
 * @param {number} y - Mercator latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
og.LonLat.inverseMercator = function (x, y, height) {
    var lon = 180 * x / og.mercator.POLE;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / og.mercator.POLE) * Math.PI)) - Math.PI / 2);
    return new og.LonLat(lon, lat, height);
};

/**
 * Sets coordinates.
 * @public
 * @param {number} [lon] - Longitude.
 * @param {number} [lat] - Latitude.
 * @param {number} [height] - Height.
 * @returns {og.LonLat}
 */
og.LonLat.prototype.set = function (lon, lat, height) {
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
og.LonLat.prototype.copy = function (lonLat) {
    this.lon = lonLat.lon;
    this.lat = lonLat.lat ;
    this.height = lonLat.height;
    return this;
};

/**
 * Clone the coordiante.
 * @public
 * @returns {og.LonLat}
 */
og.LonLat.prototype.clone = function () {
    return new og.LonLat(this.lon, this.lat, this.height);
};

/**
 * Converts to mercator coordinates.
 * @public
 * @returns {og.LonLat}
 */
og.LonLat.prototype.forwardMercator = function () {
    return og.LonLat.forwardMercator(this.lon, this.lat, this.height);
};

og.LonLat.prototype.forwardMercatorEPS01 = function () {
    var lat = this.lat;
    if (lat > 89.9) {
        lat = 89.9;
    } else if (lat < -89.9) {
        lat = -89.9;
    }
    return new og.LonLat(
        this.lon * og.mercator.POLE / 180,
        Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * og.mercator.POLE);
};


/**
 * Converts from mercator coordinates.
 * @public
 * @returns {og.LonLat}
 */
og.LonLat.prototype.inverseMercator = function () {
    return og.LonLat.inverseMercator(this.lon, this.lat, this.height);
};

/**
 * Compares coordinates.
 * @public
 * @param {og.LonLat} b - Coordinate to compare with.
 * @returns {boolean}
 */
og.LonLat.prototype.equal = function (b) {
    if (b.height) {
        return this.lon == b.lon && this.lat == b.lat && this.height == b.height;
    } else {
        return this.lon == b.lon && this.lat == b.lat;
    }
};
