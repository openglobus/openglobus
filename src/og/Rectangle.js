'use strict';

/**
 * 2D Rectangle class.
 * @class
 * @param {number} [left] - Left coordinate. 0 - default.
 * @param {number} [top] - Top coordinate. 0 - default.
 * @param {number} [right] - Right coordinate. 0 - default.
 * @param {number} [bottom] - Bottom coordinate. 0 - default.
*/
class Rectangle {
    constructor(left, top, right, bottom) {

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
    }

    /**
     * Clone rectangle object.
     * @public
     * @returns {Rectangle}
     */
    clone() {
        return new Rectangle(this.left, this.top, this.right, this.bottom);
    }

    /**
     * Returns rectangle width.
     * @public
     * @type {number}
     */
    getWidth() {
        return Math.abs(this.right - this.left);
    }

    /**
     * Returns rectangle height.
     * @public
     * @type {number}
     */
    getHeight() {
        return Math.abs(this.bottom - this.top);
    }

    /**
     * Returns rectangle area.
     * @public
     * @type {number}
     */
    getSquare() {
        return this.getHeight() * this.getWidth();
    }

    /**
     * Returns rectangle diagonal size.
     * @public
     * @type {number}
     */
    getDiagonal() {
        var w = this.getWidth(),
            h = this.getHeight();
        return Math.sqrt(h * h + w * w);
    }

    /**
     * Returns true if rectangle fits their size in width and height.
     * @public
     * @param {number} width - Width.
     * @param {number} height - Height.
     * @type {boolean}
     */
    fit(width, height) {
        return (this.getWidth() == width && this.getHeight() == height);
    }

    isInside(x, y) {
        return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
    }
}

export { Rectangle };