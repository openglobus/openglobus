goog.provide('og.gmx.TileData');

/**
 * Represents geomixer vector tile data. Stores tile geometries and rendering data.
 * @class
 */
og.gmx.TileData = function (data, x, y, z, v) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = v;
    this.items = data.values;
    this.x = x;
    this.y = y;
    this.z = z;
};

og.gmx.TileData.prototype.setData = function (data) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.items = data.values;
};