goog.provide('og.QueueArray');

og.QueueArray = function (size) {
    this._size = size || 2048;
    this._array = new Array(this._size);
    this._popIndex = parseInt(this._size * 0.5);
    this._shiftIndex = this._popIndex;
    this.length = 0;
};

og.QueueArray.prototype.clear = function () {
    this._array.length = 0;
    this._array = new Array(this._size);
    this._popIndex = parseInt(this._size * 0.5);
    this._shiftIndex = this._popIndex;
    this.length = 0;
};


og.QueueArray.prototype.push = function (data) {
    this.length++;
    this._array[this._popIndex++] = data;
};

og.QueueArray.prototype.pop = function () {
    if (this.length) {
        this.length--;
        var res = this._array[--this._popIndex]
        this._array[this._popIndex] = null;
        if (!this._array[this._popIndex - 1]) {
            this._popIndex = parseInt(this._size * 0.5);
            this._shiftIndex = this._popIndex;
        }
        return res;
    }
    return undefined;
};


og.QueueArray.prototype.unshift = function (data) {
    this.length++;
    this._array[--this._shiftIndex] = data;
};

og.QueueArray.prototype.shift = function () {
    if (this.length) {
        this.length--;
        var res = this._array[this._shiftIndex];
        this._array[this._shiftIndex++] = null;
        if (!this._array[this._shiftIndex]) {
            this._popIndex = parseInt(this._size * 0.5);
            this._shiftIndex = this._popIndex;
        }
        return res;
    }
    return undefined;
};


og.QueueArray.prototype.each = function (callback) {
    for (var i = this._shiftIndex; i < this._popIndex; i++) {
        callback(this._array[i]);
    }
};