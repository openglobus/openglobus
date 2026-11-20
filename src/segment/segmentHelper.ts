/**
 * @module og/segment/SegmentHelper
 */

import { N, W, S, E } from "../quadTree/quadTree";

type IndexTypeArray = Uint32Array;
type IndexesTable = [IndexTypeArray[][], IndexTypeArray[][], IndexTypeArray[][], IndexTypeArray[][]];

function NewIndexesTypedArray(arr: number[]): IndexTypeArray {
    return new Uint32Array(arr);
}

/**
 * Index array of the GPU buffer: 16 bit when the indexes fit, 32 bit otherwise.
 * Index 0xFFFF restarts a primitive in WebGL2, so the 16 bit indexes stay below it.
 * @param length - Index count.
 * @param vertexCount - Vertex count, the indexes are less than it.
 */
export function createIndexesArray(length: number, vertexCount: number): Uint16Array | Uint32Array {
    return vertexCount <= 0xffff ? new Uint16Array(length) : new Uint32Array(length);
}

function createCenterBodyIndexes(size: number): IndexTypeArray {
    let indexes = [];

    let i0 = 1,
        j0 = 1;

    let i1 = 1,
        j1 = 1;

    let ind1 = 0,
        ind2 = 0,
        nr = 0;
    for (let i = i0; i < size - 1 - i1; i++) {
        for (let j = j0; j < size - j1; j++) {
            ind1 = i * size + j;
            nr = (i + 1) * size;
            ind2 = nr + j;
            indexes.push(ind1, ind2);
        }
        indexes.push(ind2, nr + j0);
    }
    indexes.push(indexes[indexes.length - 1], size * size - size);

    return NewIndexesTypedArray(indexes);
}

function createWestNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    const b = size * size - size;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = b - size * i - size + 1,
            lind = b - size * k;
        indexes.push(lind, rind);
    }

    if (deltaGr === size - 1) {
        indexes.push(size);
        indexes.push(0);
    }

    return NewIndexesTypedArray(indexes);
}

function createNorthNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = size + i + 1,
            lind = k;
        indexes.push(lind, rind);
    }

    if (deltaGr === size - 1) {
        indexes.push(size - 2);
        indexes.push(size - 1);
    }

    return NewIndexesTypedArray(indexes);
}

function createEastNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = size * (i + 1) + size - 2,
            lind = size + size * k - 1;
        indexes.push(lind, rind);
    }

    if (deltaGr === size - 1) {
        indexes.push(size * (size - 1) - 1);
        indexes.push(size * size - 1);
    }

    return NewIndexesTypedArray(indexes);
}

function createSouthNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    const rb = size * (size - 1) - 2;
    const lb = size * size - 1;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = rb - i,
            lind = lb - k;
        indexes.push(lind, rind);
    }

    if (deltaGr === size - 1) {
        indexes.push(size * size - size + 1);
    }
    indexes.push(size * size - size);

    return NewIndexesTypedArray(indexes);
}

function initIndexesBodySkirts(pow: number): IndexesTable {
    let table: IndexesTable = [[], [], [], []];

    for (let i = 0; i <= pow; i++) {
        let d = Math.pow(2, i),
            d1 = d + 1;

        table[N][i] = [];
        table[W][i] = [];
        table[S][i] = [];
        table[E][i] = [];

        for (let j = 0; j <= pow; j++) {
            let dd = Math.pow(2, j);
            table[W][i][j] = createWestNeighborSkirt(d1, dd);
            table[N][i][j] = createNorthNeighborSkirt(d1, dd);
            table[E][i][j] = createEastNeighborSkirt(d1, dd);
            table[S][i][j] = createSouthNeighborSkirt(d1, dd);
        }
    }
    return table;
}

function initIndexBodiesTable(pow: number): IndexTypeArray[] {
    let table = [];
    for (let i = 0; i <= pow; i++) {
        const d = Math.pow(2, i);
        table[i] = createCenterBodyIndexes(d + 1);
    }
    return table;
}

function createTextureCoords(size: number): Uint16Array {
    let texCoords = new Uint16Array((size + 1) * (size + 1) * 2);
    let k = 0;
    for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
            texCoords[k++] = (j / size) * 0xffff;
            texCoords[k++] = (i / size) * 0xffff;
        }
    }
    return texCoords;
}

/**
 * Triangles of a grid, listed per cell. The cell in a row and column (from the north-west corner) is
 * row * size + column, and its triangles are vertices[3 * start[cell]] up to vertices[3 * start[cell + 1]],
 * three vertex indexes each.
 */
export interface CellTriangles {
    start: Uint32Array;
    vertices: Uint32Array;
}

/**
 * Lists the triangles of a triangle strip over a grid of (size + 1) x (size + 1) vertices per cell they cover.
 * A triangle is listed in every cell of its bounding box.
 * @param strip - Vertex indexes of the triangle strip.
 * @param size - Grid size, cells per side.
 */
export function createCellTriangles(strip: ArrayLike<number>, size: number): CellTriangles {
    const d = size + 1,
        start = new Uint32Array(size * size + 1);
    let vertices = new Uint32Array(0);

    // First count the triangles of every cell, then write them.
    for (let pass = 0; pass < 2; pass++) {
        const next = pass === 0 ? start : start.slice();
        for (let i = 0; i + 2 < strip.length; i++) {
            const a = strip[i],
                b = strip[i + 1],
                c = strip[i + 2];
            // The steps that join the parts of the strip repeat a vertex and draw nothing
            if (a === b || b === c || a === c) {
                continue;
            }
            const ar = (a / d) | 0,
                br = (b / d) | 0,
                cr = (c / d) | 0,
                ac = a - ar * d,
                bc = b - br * d,
                cc = c - cr * d,
                col0 = Math.min(ac, bc, cc),
                col1 = Math.max(ac, bc, cc),
                row1 = Math.max(ar, br, cr);
            for (let row = Math.min(ar, br, cr); row < row1; row++) {
                for (let col = col0; col < col1; col++) {
                    const cell = row * size + col;
                    if (pass === 0) {
                        start[cell + 1]++;
                    } else {
                        const k = next[cell]++ * 3;
                        vertices[k] = a;
                        vertices[k + 1] = b;
                        vertices[k + 2] = c;
                    }
                }
            }
        }
        if (pass === 0) {
            for (let cell = 0; cell < size * size; cell++) {
                start[cell + 1] += start[cell];
            }
            vertices = new Uint32Array(start[size * size] * 3);
        }
    }

    return { start, vertices };
}

/**
 * One slot per grid size and neighbour sizes, filled on first use by getCellTriangles.
 */
function createCellTrianglesTable(pow: number): (CellTriangles | undefined)[] {
    return new Array((pow + 1) ** 5).fill(undefined);
}

class SegmentHelper {
    protected _maxGridSize: number;
    public centerIndexesTable: IndexTypeArray[];
    public skirtsIndexesTable: IndexesTable;
    protected _cellTriangles: (CellTriangles | undefined)[];

    constructor(maxGridSize: number = 0) {
        this._maxGridSize = maxGridSize;
        this.centerIndexesTable = initIndexBodiesTable(this._maxGridSize);
        this.skirtsIndexesTable = initIndexesBodySkirts(this._maxGridSize);
        this._cellTriangles = createCellTrianglesTable(this._maxGridSize);
    }

    public get maxGridSize(): number {
        return this._maxGridSize;
    }

    public init() {
        this.centerIndexesTable = initIndexBodiesTable(this._maxGridSize);
        this.skirtsIndexesTable = initIndexesBodySkirts(this._maxGridSize);
        this._cellTriangles = createCellTrianglesTable(this._maxGridSize);
    }

    public setMaxGridSize(gridSize: number) {
        this._maxGridSize = gridSize;
        this.init();
    }

    public createSegmentIndexes(size: number, sidesSizes: [number, number, number, number]): Uint16Array | Uint32Array {
        if (size) {
            let c = this.centerIndexesTable[size],
                w = this.skirtsIndexesTable[W][size][sidesSizes[W]],
                n = this.skirtsIndexesTable[N][size][sidesSizes[N]],
                e = this.skirtsIndexesTable[E][size][sidesSizes[E]],
                s = this.skirtsIndexesTable[S][size][sidesSizes[S]];

            const d = (1 << size) + 1;

            let indexes = createIndexesArray(c.length + w.length + n.length + e.length + s.length, d * d);

            indexes.set(c, 0);
            indexes.set(w, c.length);
            indexes.set(n, c.length + w.length);
            indexes.set(e, c.length + w.length + n.length);
            indexes.set(s, c.length + w.length + n.length + e.length);

            return indexes;
        } else {
            return new Uint16Array([0, 2, 1, 3]);
        }
    }

    /**
     * The triangles drawn in every cell of a segment grid, built from the indexes createSegmentIndexes gives the GPU.
     * @param size - Grid size, log2.
     * @param sidesSizes - Neighbour grid sizes, log2.
     */
    public getCellTriangles(size: number, sidesSizes: [number, number, number, number]): CellTriangles {
        const t = this._maxGridSize + 1,
            key = (((size * t + sidesSizes[0]) * t + sidesSizes[1]) * t + sidesSizes[2]) * t + sidesSizes[3];
        let cells = this._cellTriangles[key];
        if (!cells) {
            cells = this._cellTriangles[key] = createCellTriangles(
                this.createSegmentIndexes(size, sidesSizes),
                1 << size
            );
        }
        return cells;
    }

    public initTextureCoordsTable(pow: number): Uint16Array[] {
        let table = [];
        for (let i = 0; i <= pow; i++) {
            const d = Math.pow(2, i);
            table[i] = createTextureCoords(d);
        }
        return table;
    }
}

let instance = new SegmentHelper();

export function getInstance() {
    return instance;
}
