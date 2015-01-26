goog.provide('og.QueueArray');

og.QueueArray = function () {
    this._array = new Array(512);
    this._popIndex = 256;
    this._shiftIndex = 256;
    this.length = 0;
};

og.QueueArray.prototype.clear = function () {
    this._array.length = 0;
    this._array = new Array(512);
    this._popIndex = 256;
    this._shiftIndex = 256;
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
    return this._array[this._popIndex--];
};