goog.provide('og.planetSegment.GeoImageTileCreatorQueue');

goog.require('og.inheritance');
goog.require('og.utils.GeoImageTileCreator');
goog.require('og.QueueArray');

og.planetSegment.GeoImageTileCreatorQueue = function (width, height) {
    og.inheritance.base(this, width, height);

    this.active = true;

    this._counter = 0;
    this._pendingsQueue = new og.QueueArray();
};

og.inheritance.extend(og.planetSegment.GeoImageTileCreatorQueue, og.utils.GeoImageTileCreator);

og.planetSegment.GeoImageTileCreatorQueue.prototype.shift = function (segment) {

    if (this.active) {
        segment._inTheGeoImageTileCreatorQueue = true;
        if (this._counter >= 1) {
            this._pendingsQueue.unshift(segment);
        } else {
            this._exec(segment);
        }
    }
};

og.planetSegment.GeoImageTileCreatorQueue.prototype.queue = function (segment) {

    if (this.active) {
        segment._inTheGeoImageTileCreatorQueue = true;
        if (this._counter >= 1) {
            this._pendingsQueue.push(segment);
        } else {
            this._exec(segment);
        }
    }
};

og.planetSegment.GeoImageTileCreatorQueue.prototype._exec = function (segment) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        segment.createGeoImageTileTexture();
        segment._inTheGeoImageTileCreatorQueue = false;
        that._dequeueRequest();
    }, 0);
};

og.planetSegment.GeoImageTileCreatorQueue.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length && this._counter < 1) {
        var req;
        if (req = this._whilePendings())
            this._exec(req);
    }
};

og.planetSegment.GeoImageTileCreatorQueue.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        var seg = this._pendingsQueue.pop();
        if (seg.terrainReady && seg.node.getState() != og.quadTree.NOTRENDERING && seg._inTheGeoImageTileCreatorQueue) {
            return seg;
        }
        seg._inTheGeoImageTileCreatorQueue = false;
    }
    return null;
};