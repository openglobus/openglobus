goog.provide('og.planetSegment.NormalMapCreatorQueue');

goog.require('og.inheritance');
goog.require('og.utils.NormalMapCreator');
goog.require('og.QueueArray');
goog.require('og.idle');

og.planetSegment.NormalMapCreatorQueue = function (width, height) {
    og.inheritance.base(this, width, height);

    this._lock = new og.idle.Lock();

    this._counter = 0;
    this._pendingsQueue = new og.QueueArray(1024);
};

og.inheritance.extend(og.planetSegment.NormalMapCreatorQueue, og.utils.NormalMapCreator);

/**
 * Set activity off
 * @public
 */
og.planetSegment.NormalMapCreatorQueue.prototype.lock = function (key) {
    this._lock.lock(key);
};

/**
 * Set activity on
 * @public
 */
og.planetSegment.NormalMapCreatorQueue.prototype.free = function (key) {
    this._lock.free(key);
};

og.planetSegment.NormalMapCreatorQueue.prototype.shift = function (segment) {
    if (this._lock.isFree() || segment.tileZoom > 0) {
        segment._inTheQueue = true;
        if (this._counter >= 1) {
            this._pendingsQueue.unshift(segment);
        } else {
            this._exec(segment);
        }
    }
};

og.planetSegment.NormalMapCreatorQueue.prototype.queue = function (segment) {
    if (this._lock.isFree() || segment.tileZoom > 0) {
        segment._inTheQueue = true;
        if (this._counter >= 1) {
            this._pendingsQueue.push(segment);
        } else {
            this._exec(segment);
        }
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
        var seg = this._pendingsQueue.pop();
        if (seg.terrainReady && seg._inTheQueue && seg.node.getState() !== og.quadTree.NOTRENDERING) {
            return seg;
        }
        seg._inTheQueue = false;
    }
    return null;
};

og.planetSegment.NormalMapCreatorQueue.prototype.abort = function () {
    this._pendingsQueue.each(function (s) {
        s._inTheQueue = false;
    });
    this._pendingsQueue.clear();
};