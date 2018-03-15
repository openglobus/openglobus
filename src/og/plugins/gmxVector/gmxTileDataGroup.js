goog.provide('og.gmx.TileDataGroup');

/**
 * Represents geomixer vector tile data container or grouop. Stores tile datas and their items.
 * 
 * @class
 * @param {og.gmx.VectorLayer} layer - Layer.
 * @param {og.Extent} extent - Tile geographical extent.
 */
og.gmx.TileDataGroup = function (layer, extent) {
    this.layer = layer;
    this.tileExtent = extent;
    this.tileDataArr = [];
    this.tileItemArr = [];
};

og.gmx.TileDataGroup.prototype.addTileData = function (tileData) {
    tileData.group = this;
    tileData.groupIndex = this.tileDataArr.length;
    this.tileDataArr.push(tileData);
};

og.gmx.TileDataGroup.prototype.removeTileData = function (tileData) {
    tileData.group = null;
    this.tileDataArr.splice(tileData.groupIndex, 1);
    tileData.groupIndex = -1;
    this.tileItemArr.length = 0;
    this.tileItemArr = [];
    for (var i = 0; i < this.tileDataArr.length; i++) {
        var ti = this.tileDataArr[i];
        for (var j = 0; j < ti.tileItems.length; j++) {
            this.addTileItem(ti.tileItems[j]);
        }
    }
};

og.gmx.TileDataGroup.prototype.addTileItem = function (tileItem) {
    this.tileItemArr.push(tileItem);
};