goog.provide('og.gmx.TileData');

goog.require('og.gmx.TileItem');
goog.require('og.Extent');

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
og.gmx.TileData = function (layer, data, x, y, z, v) {
    this._layer = layer;
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.version = v;
    this.items = this.convertToTileItems(data.values);
    this.x = x;
    this.y = y;
    this.z = z;
    this.extent = this.getTileExtent(data.srs, x, y, z);
};

og.gmx.TileData.prototype.getTileExtent = function (srs, x, y, z) {
    return og.Extent.fromTile(x, y, z);
};

og.gmx.TileData.prototype.convertToTileItems = function (items) {
    var l = items.length;
    var res = new Array(l);
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        res[i] = new og.gmx.TileItem(this._layer._itemCache[item[0]], item[item.length - 1]);
    }
    return res;
};

og.gmx.TileData.prototype.setData = function (data) {
    this.isGeneralized = data.isGeneralized;
    this.bbox = data.bbox;
    this.items = this.convertToTileItems(data.values);
};