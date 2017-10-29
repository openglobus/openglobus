goog.provide('og.gmx.VectorTileCreator');

goog.require('og.utils.VectorTileCreator');
goog.require('og.inheritance');

/**
 * Tile renderer
 * @class
 */
og.gmx.VectorTileCreator = function (planet, maxFrames, width, height) {
    og.inheritance.base(this, planet, maxFrames, width, height);

    planet.events.on("draw", this.frame);
};

og.inheritance.extend(og.gmx.VectorTileCreator, og.utils.VectorTileCreator);

og.gmx.VectorTileCreator.prototype.frame = function () {

};

og.gmx.VectorTileCreator.prototype.add = function (data) {
    this._queue.push(data);
};

og.gmx.VectorTileCreator.prototype.remove = function (material) {
    //...
};