goog.provide('og.utils.NormalMapCreatorAsync');

goog.require('og.inheritance');
goog.require('og.utils.NormalMapCreator');

og.utils.NormalMapCreatorAsync = function (width, height) {
    og.inheritance.base(this, width, height);

    this._counter = 0;
    this._pendingsQueue = [];
};

og.inheritance.extend(og.utils.NormalMapCreatorAsync, og.utils.NormalMapCreator);

og.utils.NormalMapCreatorAsync.prototype.drawAsync = function (normals, success) {
    var obj = { normals: normals, callback: success };
    if (this._counter >= 1) {
        this._pendingsQueue.push(obj);
    } else {
        this._exec(obj);
    }
};

og.utils.NormalMapCreatorAsync.prototype._exec = function (obj) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        var cnv = that.draw(obj.normals);
        obj.callback(cnv);
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
        if (req) {
            return req;
        }
    }
    return null;
};