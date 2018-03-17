/**
 * @module og/gmx/GmxTileData
 */

'use strict';

/**
 * Represents geomixer vector tile data. Stores tile geometries and rendering data.
 * @class
 * @param {Object} data - Geomixer vector tile data:
 * @param {Array<Number,Number,Number,Number>} data.bbox - Bounding box.
 * @param {Boolean} data.isGeneralized - Whether tile geometries are simplified.
 * @param {Array<Array<Object>>} data.values - Tile items.
 * @param {Number} data.x - Tile index for X. 
 * @param {Number} data.y - Tile index for Y. 
 * @param {Number} data.z - Tile zoom level. 
 * @param {Number} data.v - Tile version.
 */
const GmxTileData = function (data) {
    this.group = null;
    this.groupIndex = -1;
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.x = data.x;
    this.y = data.y;
    this.z = data.z;
    this.version = data.v;
    this.level = data.level;
    this.span = data.span;
    this.tileItems = [];
};

GmxTileData.prototype.addTileItem = function (tileItem) {
    tileItem.tileData = this;
    tileItem.tileDataIndex = this.tileItems.length;
    this.tileItems.push(tileItem);
};

GmxTileData.prototype.addTileItems = function (tileItems) {
    for (var i = 0; i < tileItems.length; i++) {
        this.addTileItem(tileItems[i]);
    }
};

export { GmxTileData };