goog.provide('og.utils.NormalMapCreatorAsync');

goog.require('og.inheritance');
goog.require('og.utils.NormalMapCreator');

og.utils.NormalMapCreatorAsync = function (width, height) {
    og.inheritance.base(this, width, height);

    this._counter = 0;
    this._pendingsQueue = [];
};

og.inheritance.extend(og.utils.NormalMapCreatorAsync, og.utils.NormalMapCreator);

og.utils.NormalMapCreatorAsync.prototype.drawAsync = function (segment) {
    if (this._counter >= 1) {
        this._pendingsQueue.push(segment);
    } else {
        this._exec(segment);
    }
};

og.utils.NormalMapCreatorAsync.prototype._exec = function (segment) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        var cnv = that.draw(segment.normalMapNormals);
        segment.createNormalMapTexture(cnv);
        that._dequeueRequest();
    }, 0);
};

og.utils.NormalMapCreatorAsync.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length) {
        if (this._counter < 1) {
            var req;
            if (req = this._whilePendings())
                this._exec(req);
        }
    }
};

og.utils.NormalMapCreatorAsync.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        var req = this._pendingsQueue.shift();
        //node visibility controled by terrainProvider, 
        //therefore I needn't NOTRENDERING node verification.
        if (req.normalMapNormals.length) {
            return req;
        }
    }
    return null;
};
