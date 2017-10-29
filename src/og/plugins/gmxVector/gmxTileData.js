goog.provide('og.gmx.TileData');

/**
 * Represents geomixer vector tile data. Stores tile geometries and rendering data.
 * @class
 * @param {Object} data - Geomixer vector tile data:
 * @param {Array<Number,Number,Number,Number>} data.bbox - Bounding box.
 * @param {Boolean} data.isGeneralized - Whether tile geometries are simplified.
 * @param {Array<Array<Object>>} data.values - Tile items.
 * @param {Number} x - Tile index for X. 
 * @param {Number} y - Tile index for Y. 
 * @param {Number} z - Tile zoom level. 
 * @param {Number} v - Tile version. 
 */
og.gmx.TileData = function (data, x, y, z, v, renderingVersion) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = v;
    this.items = data.values;
    this.x = x;
    this.y = y;
    this.z = z;
    this.isReady = false;
    this.renderingVersion = renderingVersion;
};

og.gmx.TileData.prototype.setData = function (data) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.items = data.values;
};