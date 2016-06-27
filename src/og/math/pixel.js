goog.provide('og.math.Pixel');

/**
 * Class represents a pixel coordinates.
 * @class
 * @param {number} [x] - X - coordinate.
 * @param {number} [y] - Y - coordinate.
 */
og.math.Pixel = function (x, y) {

    /**
     * X
     * @public
     * @type {number}
     */
    this.x = x || 0;

    /**
     * Y
     * @public
     * @type {number}
     */
    this.y = y || 0;
};