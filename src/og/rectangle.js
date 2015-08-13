goog.provide('og.Rectangle');

og.Rectangle = function (left, top, right, bottom) {
    this.left = left || 0;
    this.right = right || 0;
    this.top = top || 0;
    this.bottom = bottom || 0;
};

og.Rectangle.prototype.clone = function () {
    return new og.Rectangle(this.left, this.top, this.right, this.bottom);
};

og.Rectangle.prototype.getWidth = function () {
    return Math.abs(this.right - this.left);
};

og.Rectangle.prototype.getHeight = function () {
    return Math.abs(this.bottom - this.top);
};

og.Rectangle.prototype.getSquare = function () {
    return this.getHeight() * this.getWidth();
};

og.Rectangle.prototype.getDiagonal = function () {
    var w = this.getWidth(),
        h = this.getHeight();
    return Math.sqrt(h * h + w * w);
};

og.Rectangle.prototype.fit = function (width, height) {
    return (this.getWidth() == width && this.getHeight() == height);
};