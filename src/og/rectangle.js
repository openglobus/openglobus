goog.provide('og.Rectangle');

/**
 * 2D Rectangle class.
 * @class
 * @param {number} [left] - Left coordinate. 0 - default.
 * @param {number} [top] - Top coordinate. 0 - default.
 * @param {number} [right] - Right coordinate. 0 - default.
 * @param {number} [bottom] - Bottom coordinate. 0 - default.
*/
og.Rectangle = function (left, top, right, bottom) {

    /**
     * Left coordinate.
     * @public
     * @type {number}
     */
    this.left = left || 0;

    /**
     * Right coordinate.
     * @public
     * @type {number}
     */
    this.right = right || 0;

    /**
     * Top coordinate.
     * @public
     * @type {number}
     */
    this.top = top || 0;

    /**
     * Top coordinate.
     * @public
     * @type {number}
     */
    this.bottom = bottom || 0;
};

/**
 * Clone rectangle object.
 * @public
 * @returns {og.Rectangle}
 */
og.Rectangle.prototype.clone = function () {
    return new og.Rectangle(this.left, this.top, this.right, this.bottom);
};

/**
 * Returns rectangle width.
 * @public
 * @type {number}
 */
og.Rectangle.prototype.getWidth = function () {
    return Math.abs(this.right - this.left);
};

/**
 * Returns rectangle height.
 * @public
 * @type {number}
 */
og.Rectangle.prototype.getHeight = function () {
    return Math.abs(this.bottom - this.top);
};

/**
 * Returns rectangle area.
 * @public
 * @type {number}
 */
og.Rectangle.prototype.getSquare = function () {
    return this.getHeight() * this.getWidth();
};

/**
 * Returns rectangle diagonal size.
 * @public
 * @type {number}
 */
og.Rectangle.prototype.getDiagonal = function () {
    var w = this.getWidth(),
        h = this.getHeight();
    return Math.sqrt(h * h + w * w);
};

/**
 * Returns true if rectangle fits their size in width and height.
 * @public
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @type {boolean}
 */
og.Rectangle.prototype.fit = function (width, height) {
    return (this.getWidth() == width && this.getHeight() == height);
};