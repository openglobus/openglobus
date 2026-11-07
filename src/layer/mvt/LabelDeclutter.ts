/**
 * Greedy screen-space label placement. Boxes are tried in priority order,
 * a box is placed only if it doesn't overlap any box placed before it.
 * A uniform grid keeps the overlap test local.
 * @class
 * @param {number} [cellSize=64] - Grid cell size in pixels.
 */
export class LabelDeclutter {
    public cellSize: number;

    protected _width: number;

    protected _height: number;

    protected _cols: number;

    protected _rows: number;

    protected _cells: number[][];

    /**
     * Placed boxes as [minX, minY, maxX, maxY, ...].
     * @protected
     */
    protected _boxes: number[];

    constructor(cellSize: number = 64) {
        this.cellSize = cellSize;
        this._width = 0;
        this._height = 0;
        this._cols = 0;
        this._rows = 0;
        this._cells = [];
        this._boxes = [];
    }

    /**
     * Removes placed boxes and sets the screen size.
     * @public
     * @param {number} width - Screen width in pixels.
     * @param {number} height - Screen height in pixels.
     */
    public reset(width: number, height: number) {
        const cols = Math.max(1, Math.ceil(width / this.cellSize)),
            rows = Math.max(1, Math.ceil(height / this.cellSize));

        if (cols !== this._cols || rows !== this._rows) {
            this._cols = cols;
            this._rows = rows;
            this._cells = new Array(cols * rows);
            for (let i = 0; i < this._cells.length; i++) {
                this._cells[i] = [];
            }
        } else {
            for (let i = 0; i < this._cells.length; i++) {
                this._cells[i].length = 0;
            }
        }

        this._width = width;
        this._height = height;
        this._boxes.length = 0;
    }

    /**
     * Places the box if it is on the screen and doesn't overlap already placed boxes.
     * @public
     * @returns {boolean} True if the box has been placed.
     */
    public tryPlace(minX: number, minY: number, maxX: number, maxY: number): boolean {
        if (maxX < 0 || maxY < 0 || minX > this._width || minY > this._height) {
            return false;
        }

        const c0 = this._col(minX),
            c1 = this._col(maxX),
            r0 = this._row(minY),
            r1 = this._row(maxY);

        const b = this._boxes;

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const cell = this._cells[r * this._cols + c];
                for (let i = 0; i < cell.length; i++) {
                    const j = cell[i];
                    if (minX < b[j + 2] && maxX > b[j] && minY < b[j + 3] && maxY > b[j + 1]) {
                        return false;
                    }
                }
            }
        }

        const index = b.length;
        b.push(minX, minY, maxX, maxY);

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                this._cells[r * this._cols + c].push(index);
            }
        }

        return true;
    }

    protected _col(x: number): number {
        return Math.min(this._cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    }

    protected _row(y: number): number {
        return Math.min(this._rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
    }
}

/**
 * Returns the collision box of a label as [minX, minY, maxX, maxY]: the text box scaled around its center
 * by strength, with padding on every side.
 * @param {number} minX - Text box left.
 * @param {number} minY - Text box top.
 * @param {number} maxX - Text box right.
 * @param {number} maxY - Text box bottom.
 * @param {number} strength - Box scale, below 1 labels may overlap partly, above 1 they keep more space.
 * @param {number} padding - Extra space on every side, pixels.
 * @param {number[]} [out] - Result array.
 * @returns {number[]} -
 */
export function getLabelCollisionBox(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    strength: number,
    padding: number,
    out: number[] = [0, 0, 0, 0]
): number[] {
    const s = Math.max(0, strength) * 0.5,
        cx = (minX + maxX) * 0.5,
        cy = (minY + maxY) * 0.5,
        hw = (maxX - minX) * s + padding,
        hh = (maxY - minY) * s + padding;
    out[0] = cx - hw;
    out[1] = cy - hh;
    out[2] = cx + hw;
    out[3] = cy + hh;
    return out;
}
