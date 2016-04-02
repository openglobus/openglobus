goog.provide('og.QueueArray');

og.QueueArray = function () {
    this._array = new Array(2048);
    this._popIndex = 1024;
    this._shiftIndex = 1024;
    this.length = 0;
};

og.QueueArray.prototype.clear = function () {
    this._array.length = 0;
    this._array = new Array(2048);
    this._popIndex = 1024;
    this._shiftIndex = 1024;
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