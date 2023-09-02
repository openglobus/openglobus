import { QueueArray } from '../QueueArray.js';

class ImagesCacheManager {
    constructor() {
        this.imagesCache = {};

        this._counter = 0;
        this._pendingsQueue = new QueueArray();
        this._imageIndexCounter = 0;
    }

    load(src, success) {
        if (this.imagesCache[src]) {
            success(this.imagesCache[src]);
        } else {
            var req = { "src": src, "success": success };
            if (this._counter >= 1) {
                this._pendingsQueue.unshift(req);
            } else {
                this._exec(req);
            }
        }
    }

    _exec(req) {
        this._counter++;
        var that = this;

        var img = new Image();
        img.crossOrigin = '';
        img.onload = function () {
            that.imagesCache[req.src] = img;
            this.__nodeIndex = that._imageIndexCounter++;
            req.success(this);
            that._dequeueRequest();
        };

        img.onerror = function () {
            that._dequeueRequest();
        };

        img.src = req.src;
    }

    _dequeueRequest() {
        this._counter--;
        if (this._pendingsQueue.length && this._counter < 1) {
            while (this._pendingsQueue.length) {
                var req = this._pendingsQueue.pop();
                if (req) {
                    if (this.imagesCache[req.src]) {
                        if (this._counter <= 0) {
                            this._counter = 0;
                        } else {
                            this._counter--;
                        }
                        req.success(this.imagesCache[req.src]);
                    } else {
                        this._exec(req);
                        break;
                    }
                }
            }
        }
    }
}

export { ImagesCacheManager };