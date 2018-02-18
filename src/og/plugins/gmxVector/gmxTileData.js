goog.provide('og.gmx.TileData');

goog.require('og.gmx.TileItem');
goog.require('og.Extent');

/**
 * Represents geomixer vector tile data. Stores tile geometries and rendering data.
 * @class
 * @param {og.gmx.TileDataGroup} group - Tile data group.
 * @param {Object} data - Geomixer vector tile data:
 * @param {Array<Number,Number,Number,Number>} data.bbox - Bounding box.
 * @param {Boolean} data.isGeneralized - Whether tile geometries are simplified.
 * @param {Array<Array<Object>>} data.values - Tile items.
 * @param {Number} data.x - Tile index for X. 
 * @param {Number} data.y - Tile index for Y. 
 * @param {Number} data.z - Tile zoom level. 
 * @param {Number} data.v - Tile version.
 */
og.gmx.TileData = function (group, data) {
    this.group = group;
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = data.v;
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
    this.items = [];
};

og.gmx.TileData.prototype.addTileItem = function (item) {
    this.items.push(item);
};

og.gmx.TileData.prototype.addTileItems = function (items) {
    for (var i = 0; i < items.length; i++) {
        this.addItem(items[i]);
    }
};

og.gmx.TileData.prototype.setData = function (data) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = data.v;
};