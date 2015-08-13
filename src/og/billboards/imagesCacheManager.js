goog.provide('og.ImagesCacheManager');

goog.require('og.QueueArray');

og.ImagesCacheManager = function () {
    this.imagesCache = {};

    this._counter = 0;
    this._pendingsQueue = new og.QueueArray();
    this._imageIndexCounter = 0;
};

og.ImagesCacheManager.prototype.load = function (url, success) {
    if (this.imagesCache[url]) {
        success(this.imagesCache[url]);
    } else {
        var req = { "url": url, "success": success };
        if (this._counter >= 1) {
            this._pendingsQueue.push(req);
        } else {
            this._exec(req);
        }
    }
};

og.ImagesCacheManager.prototype._exec = function (req) {
    this._counter++;
    var that = this;

    var img = new Image();
    img.crossOrigin = '';
    img.onload = function () {
        that.imagesCache[req.url] = this;
        this.__nodeIndex = that._imageIndexCounter++;
        req.success(this);
        that._dequeueRequest();
    };

    img.src = req.url;
};

og.ImagesCacheManager.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length && this._counter < 1) {
        var req = this._whilePendings();
        if (req) {
            if (this.imagesCache[req.url]) {
                req.success(this.imagesCache[req.url]);
            } else {
                this._exec(req);
            }
        }
    }
};

og.ImagesCacheManager.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        var seg = this._pendingsQueue.pop();
        if (seg) {
            return seg;
        }
    }
    return null;
};