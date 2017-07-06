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
}
og.QueueArray.prototype.push = function (data) {
    this.length++;
    this._array[++this._popIndex] = data;
};

og.QueueArray.prototype.unshift = function (data) {
    this.length++;
    this._array[this._shiftIndex--] = data;
};

og.QueueArray.prototype.pop = function () {
    this.length--;
    var res = this._array[this._popIndex]
    this._array[this._popIndex] = null;
    this._popIndex--;
    return res;
};

og.QueueArray.prototype.each = function (callback) {
    for (var i = this._shiftIndex + 1; i < this._popIndex + 1; i++) {
        callback(this._array[i]);
    }
};