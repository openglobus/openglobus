goog.provide('og.gmx.TileDataGroup');

/**
 * Represents geomixer vector tile data container or grouop. Stores tile datas and their items.
 * 
 * @class
 * @param {og.gmx.VectorLayer} layer - Layer.
 * @param {Number} x - Tile index for X. 
 * @param {Number} y - Tile index for Y. 
 * @param {Number} z - Tile zoom level. 
 */
og.gmx.TileDataGroup = function (layer, extent) {
    this.layer = layer;
    this.tileExtent = extent;
    this.tileDataArr = [];
    this.tileItemArr = [];
};

og.gmx.TileDataGroup.prototype.addTileData = function (tileData) {
    this.tileDataArr.push(tileData);
};

og.gmx.TileDataGroup.prototype.addTileItem = function(tileItem){
    this.tileItemArr.push(tileItem);
};