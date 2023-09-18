/**
 * 2D Rectangle class.
 * @class
 * @param {number} [left] - Left coordinate. 0 - default.
 * @param {number} [top] - Top coordinate. 0 - default.
 * @param {number} [right] - Right coordinate. 0 - default.
 * @param {number} [bottom] - Bottom coordinate. 0 - default.
 */
class Rectangle {
    /**
     * Left coordinate.
     * @public
     * @type {number}
     */
    public left: number;

    /**
     * Right coordinate.
     * @public
     * @type {number}
     */
    public right: number;

    /**
     * Top coordinate.
     * @public
     * @type {number}
     */
    public top: number;

    /**
     * Top coordinate.
     * @public
     * @type {number}
     */
    public bottom: number;

    constructor(left: number = 0, top: number = 0, right: number = 0, bottom: number = 0) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }

    public set(left: number = 0, top: number = 0, right: number = 0, bottom: number = 0) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }

    /**
     * Clone rectangle object.
     * @public
     * @returns {Rectangle}
     */
    public clone(): Rectangle {
        return new Rectangle(this.left, this.top, this.right, this.bottom);
    }

    /**
     * Returns rectangle width.
     * @public
     * @type {number}
     */
    public getWidth(): number {
        return Math.abs(this.right - this.left);
    }

    /**
     * Returns rectangle height.
     * @public
     * @type {number}
     */
    public getHeight(): number {
        return Math.abs(this.bottom - this.top);
    }

    /**
     * Returns rectangle area.
     * @public
     * @type {number}
     */
    public getSquare(): number {
        return this.getHeight() * this.getWidth();
    }

    /**
     * Returns rectangle diagonal size.
     * @public
     * @type {number}
     */
    public getDiagonal(): number {
        let w = this.getWidth(),
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
    public fit(width: number, height: number): boolean {
        return this.getWidth() === width && this.getHeight() === height;
    }

    public isInside(x: number, y: number): boolean {
        return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
    }
}

export {Rectangle};
