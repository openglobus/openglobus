goog.provide('og.planetSegment.NormalMapCreatorQueue');

goog.require('og.inheritance');
goog.require('og.utils.NormalMapCreator');

og.planetSegment.NormalMapCreatorQueue = function (width, height) {
    og.inheritance.base(this, width, height);

    this._counter = 0;
    this._pendingsQueue = [];
};

og.inheritance.extend(og.planetSegment.NormalMapCreatorQueue, og.utils.NormalMapCreator);

og.planetSegment.NormalMapCreatorQueue.prototype.shift = function (segment) {
    if (this._counter >= 1) {
        segment._inTheQueue = true;
        this._pendingsQueue.unshift(segment);
    } else {
        this._exec(segment);
    }
};

og.planetSegment.NormalMapCreatorQueue.prototype.queue = function (segment) {
    if (this._counter >= 1) {
        segment._inTheQueue = true;
        this._pendingsQueue.push(segment);
    } else {
        this._exec(segment);
    }
};

og.planetSegment.NormalMapCreatorQueue.prototype._exec = function (segment) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        segment.createNormalMapTexture();
        segment._inTheQueue = false;
        that._dequeueRequest();
    }, 0);
};

og.planetSegment.NormalMapCreatorQueue.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length && this._counter < 1) {
        var req;
        if (req = this._whilePendings())
            this._exec(req);
    }
};

og.planetSegment.NormalMapCreatorQueue.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        //node visibility controled by terrainProvider, 
        //therefore I needn't NOTRENDERING node verification.
        var seg = this._pendingsQueue.pop();
        if (seg.terrainReady && seg.normalMapNormals.length) {
            return seg;
        }
    }
    return null;
};
